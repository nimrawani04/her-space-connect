import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hasSupabaseBrowserConfig } from "@/integrations/supabase/config";

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

    let done = false;
    const go = (to: "/dashboard" | "/auth") => {
      if (done) return;
      done = true;
      navigate({ to });
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) go("/dashboard");
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) go("/dashboard");
      })
      .catch(() => {});

    // Give the OAuth handoff a moment before falling back to the sign-in page.
    const timer = window.setTimeout(() => go("/auth"), 6000);

    return () => {
      window.clearTimeout(timer);
      sub.subscription.unsubscribe();
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
