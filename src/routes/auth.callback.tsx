import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { hasSupabaseBrowserConfig } from "@/integrations/supabase/config";
import {
  completeAuthRedirect,
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

  useEffect(() => {
    if (!hasSupabaseBrowserConfig()) {
      navigate({ to: "/auth" });
      return;
    }

    let cancelled = false;
    void waitForAuthenticatedUser().then((user) => {
      if (cancelled) return;
      if (user) {
        completeAuthRedirect();
        return;
      }
      navigate({ to: "/auth", replace: true });
    });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="min-h-dvh flex items-center justify-center p-6 text-center">
      <div className="space-y-3">
        <h1 className="font-serif italic text-3xl">One moment…</h1>
        <p className="text-sm text-muted-foreground">Finishing your secure sign-in.</p>
      </div>
    </main>
  );
}
