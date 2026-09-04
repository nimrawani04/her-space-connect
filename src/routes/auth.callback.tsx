import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { hasSupabaseBrowserConfig } from "@/integrations/supabase/config";
import { toast } from "sonner";
import {
  authLog,
  completeAuthRedirect,
  consumeOAuthFragmentSession,
  waitForAuthenticatedUser,
} from "@/lib/auth-redirect";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Signing you in · HerSpace" },
      { name: "description", content: "Completing your secure sign-in to HerSpace." },
      { property: "og:title", content: "Signing you in · HerSpace" },
      { property: "og:description", content: "Completing your secure sign-in to HerSpace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const runAuthCheck = async () => {
      authLog("callback.started", { url: window.location.href });
      
      // Check for OAuth errors in URL (both query params and hash)
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      
      const error = params.get("error") || hashParams.get("error");
      const errorDescription = params.get("error_description") || hashParams.get("error_description");
      const errorCode = params.get("error_code") || hashParams.get("error_code");
      
      if (error) {
        authLog("callback.oauth-error", { error, errorCode, errorDescription });
        
        let message = "Google sign-in failed. ";
        
        if (errorDescription?.includes("exchange external code")) {
          message += "OAuth configuration issue. Please verify Google Cloud Console redirect URLs.";
        } else {
          message += errorDescription || "Please try again.";
        }
        
        setErrorMsg(message);
        toast.error("Sign-in failed", {
          description: errorDescription || "Please try again.",
        });
        
        setTimeout(() => {
          if (!cancelled) navigate({ to: "/auth", replace: true });
        }, 3000);
        return;
      }
      
      // Check for demo user first
      const demoUser = typeof window !== "undefined" ? localStorage.getItem("herspace_demo_user") : null;
      if (demoUser) {
        authLog("callback.demo-user-redirect");
        window.location.replace("/dashboard");
        return;
      }

      if (!hasSupabaseBrowserConfig()) {
        authLog("callback.no-supabase-config");
        navigate({ to: "/auth", replace: true });
        return;
      }

      // Try to get the session
      let user = null;
      try {
        authLog("callback.consuming-oauth-session");
        user = await consumeOAuthFragmentSession();
        authLog("callback.oauth-consumed", { hasUser: Boolean(user) });
      } catch (error) {
        authLog("callback.oauth-error-caught", {
          reason: error instanceof Error ? error.message : "unknown",
        });
      }

      // Wait for session if not immediately available
      if (!user) {
        try {
          authLog("callback.waiting-for-session");
          user = await waitForAuthenticatedUser(10_000);
          authLog("callback.session-wait-complete", { hasUser: Boolean(user) });
        } catch (error) {
          authLog("callback.session-wait-failed", {
            reason: error instanceof Error ? error.message : "unknown",
          });
        }
      }

      if (cancelled) return;
      
      // If we have a user, redirect to dashboard
      if (user) {
        authLog("callback.success-redirecting-to-dashboard");
        // Force redirect to dashboard immediately
        window.location.replace("/dashboard");
        return;
      }
      
      // No user found after all attempts
      authLog("callback.no-session-found");
      toast.error("Sign-in incomplete", {
        description: "Could not complete sign-in. Please try again.",
      });
      
      setTimeout(() => {
        if (!cancelled) navigate({ to: "/auth", replace: true });
      }, 1000);
    };

    void runAuthCheck();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (errorMsg) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6">
        <div className="max-w-lg space-y-4 text-center">
          <h1 className="font-serif italic text-3xl text-destructive">Sign-in Error</h1>
          <div className="text-sm text-muted-foreground whitespace-pre-line bg-muted p-4 rounded-lg text-left font-mono text-xs">
            {errorMsg}
          </div>
          <p className="text-xs text-muted-foreground">Redirecting back to sign in...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-6 text-center">
      <div className="space-y-3">
        <h1 className="font-serif italic text-3xl">One moment…</h1>
        <p className="text-sm text-muted-foreground">Finishing your secure sign-in.</p>
      </div>
    </main>
  );
}
