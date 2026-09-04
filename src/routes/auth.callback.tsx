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
      authLog("callback.started");
      
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
          message += "OAuth configuration issue detected. Please check:\n\n";
          message += "1. Google Cloud Console has the correct redirect URL:\n";
          message += "   https://foteraufomwdujwappjt.supabase.co/auth/v1/callback\n\n";
          message += "2. Google OAuth is enabled in Supabase Dashboard\n\n";
          message += "3. Client ID and Secret are correctly configured";
        } else {
          message += errorDescription || "Please try again or contact support.";
        }
        
        setErrorMsg(message);
        toast.error("Sign-in failed", {
          description: errorDescription?.includes("exchange external code") 
            ? "OAuth configuration error. Check console for details."
            : errorDescription || "Please try again.",
        });
        
        setTimeout(() => {
          if (!cancelled) navigate({ to: "/auth", replace: true });
        }, 5000);
        return;
      }
      
      // First check for demo user
      const demoUser = typeof window !== "undefined" ? localStorage.getItem("herspace_demo_user") : null;
      if (demoUser) {
        authLog("callback.demo-user-found");
        completeAuthRedirect();
        return;
      }

      if (!hasSupabaseBrowserConfig()) {
        authLog("callback.config-missing");
        navigate({ to: "/auth", replace: true });
        return;
      }

      let user = null;
      try {
        user = await consumeOAuthFragmentSession();
        authLog("callback.fragment-consumed", { hasUser: Boolean(user) });
      } catch (error) {
        authLog("callback.fragment-error", {
          reason: error instanceof Error ? error.message : "unknown",
        });
      }

      if (!user) {
        try {
          user = await waitForAuthenticatedUser(10_000);
          authLog("callback.wait-completed", { hasUser: Boolean(user) });
        } catch (error) {
          authLog("callback.wait-error", {
            reason: error instanceof Error ? error.message : "unknown",
          });
        }
      }

      if (cancelled) return;
      
      if (user) {
        authLog("callback.session-confirmed");
        completeAuthRedirect();
        return;
      }
      
      authLog("callback.session-missing");
      toast.error("Sign-in incomplete", {
        description: "Could not complete sign-in. Please try again.",
      });
      navigate({ to: "/auth", replace: true });
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
          <div className="text-sm text-muted-foreground whitespace-pre-line bg-muted p-4 rounded-lg text-left">
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
