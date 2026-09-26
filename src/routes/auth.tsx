import { createFileRoute, Link, useNavigate, useSearch, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { hasSupabaseBrowserConfig } from "@/integrations/supabase/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  authLog,
  clearAuthDestination,
  completeAuthRedirect,
  consumeOAuthFragmentSession,
  getAuthDestination,
  rememberAuthDestination,
  waitForAuthenticatedUser,
} from "@/lib/auth-redirect";

const searchSchema = z
  .object({
    mode: z.enum(["signin", "signup"]).optional(),
    code: z.string().optional(),
    state: z.string().optional(),
    error: z.string().optional(),
    error_description: z.string().optional(),
    error_code: z.string().optional(),
  })
  .passthrough();

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in · HerSpace" },
      {
        name: "description",
        content:
          "Sign in to HerSpace — a women-only ecosystem for health, safety, mentorship, and sisterhood.",
      },
    ],
  }),
  component: AuthLayout,
});

function AuthLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/auth/callback" || pathname.startsWith("/auth/callback/")) {
    return <Outlet />;
  }
  return <AuthPage />;
}

const credSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(72),
  displayName: z.string().trim().min(1).max(60).optional(),
});

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth", strict: false });
  const [mode, setMode] = useState<"signin" | "signup">(search?.mode === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (hasSupabaseBrowserConfig()) {
      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user && !cancelled) {
          authLog("auth-page.auth-state-redirect");
          clearAuthDestination();
          window.location.replace("/dashboard");
        }
      });

      (async () => {
        let user = null;
        try {
          user = await consumeOAuthFragmentSession();
          authLog("auth-page.fragment-consumed", { hasUser: Boolean(user) });
        } catch {
          /* ignore fragment errors */
        }
        if (!user) {
          try {
            user = await waitForAuthenticatedUser(4_000);
            authLog("auth-page.wait-completed", { hasUser: Boolean(user) });
          } catch {
            /* no active session */
          }
        }
        if (!cancelled && user) {
          authLog("auth-page.forcing-dashboard");
          clearAuthDestination();
          window.location.replace("/dashboard");
        }
      })();

      return () => {
        cancelled = true;
        sub.subscription.unsubscribe();
      };
    } else {
      const demoUser = localStorage.getItem("herspace_demo_user");
      if (demoUser) {
        authLog("auth-page.demo-user-redirect");
        navigate({ to: "/dashboard" });
      }
    }

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = credSchema.safeParse({
      email,
      password,
      displayName: mode === "signup" ? name : undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    try {
      if (hasSupabaseBrowserConfig()) {
        if (mode === "signup") {
          const { error } = await supabase.auth.signUp({
            email: parsed.data.email,
            password: parsed.data.password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
              data: { full_name: parsed.data.displayName },
            },
          });
          if (error) throw error;
          toast.success("Welcome to HerSpace.");
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email: parsed.data.email,
            password: parsed.data.password,
          });
          if (error) throw error;
          toast.success("Signed in successfully.");
        }
        // Force redirect to dashboard
        authLog("auth-page.email-signin-success");
        window.location.href = "/dashboard";
      } else {
        localStorage.setItem(
          "herspace_demo_user",
          JSON.stringify({
            email: parsed.data.email,
            name: parsed.data.displayName || parsed.data.email.split("@")[0],
          }),
        );
        toast.success(mode === "signup" ? "Welcome to HerSpace!" : "Signed in successfully.");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const targetDestination = "/dashboard";
    rememberAuthDestination(targetDestination);
    authLog("google.sign-in-started", { 
      callback: "/auth/callback",
      savedDestination: targetDestination,
      currentPath: window.location.pathname,
    });
    
    try {
      if (!hasSupabaseBrowserConfig()) {
        throw new Error("Google sign-in needs Supabase to be configured.");
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: "select_account" },
        },
      });

      if (error) throw error;

      authLog("google.full-page-redirect-started");
    } catch (err) {
      authLog("google.sign-in-failed", {
        reason: err instanceof Error ? err.message : "unknown",
      });
      setLoading(false);
      toast.error(err instanceof Error ? err.message : "Google sign-in failed. Please try again.");
    }
  }

  function handleDemoSignIn() {
    setLoading(true);
    localStorage.setItem(
      "herspace_demo_user",
      JSON.stringify({
        email: "guest@herspace.app",
        name: "Sister",
      }),
    );
    toast.success("Welcome! Signed in to HerSpace.");
    navigate({ to: "/dashboard" });
  }

  return (
    <section className="relative w-full min-h-dvh overflow-hidden bg-black text-white">
      <video
        className="absolute inset-0 w-full h-full object-cover anim-fade-in"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_115057_94c3699b-0fd1-4124-bcf3-3626bb8c1f77.mp4"
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="absolute inset-0 bg-black/60" />

      <div className="absolute inset-0 pointer-events-none">
        {["12.6%", "37.5%", "61.9%", "86.2%"].map((left, i) => (
          <div
            key={`v${left}`}
            className="absolute top-0 h-full w-px bg-white/[0.04] anim-grid-v"
            style={{ left, animationDelay: `${600 + i * 100}ms` }}
          />
        ))}
        {["32.7%", "71.4%"].map((top, i) => (
          <div
            key={`h${top}`}
            className="absolute left-0 w-full h-px bg-white/[0.04] anim-grid-h"
            style={{ top, animationDelay: `${800 + i * 150}ms` }}
          />
        ))}
        {["32.7%", "71.4%"].flatMap((top) =>
          ["12.6%", "37.5%", "61.9%", "86.2%"].map((left) => ({ left, top })),
        ).map((m, i) => (
          <div
            key={`p${i}`}
            className="absolute anim-fade-in"
            style={{ left: m.left, top: m.top, animationDelay: `${1000 + i * 80}ms` }}
          >
            <div className="absolute w-[10px] h-px bg-white/70 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute w-px h-[10px] bg-white/70 -translate-x-1/2 -translate-y-1/2" />
          </div>
        ))}
      </div>

      <div className="absolute inset-0 pointer-events-none hidden md:block">
        <svg
          className="absolute inset-0 w-full h-full anim-fade-in"
          style={{ animationDelay: "1200ms" }}
        >
          <line x1="38%" y1="14%" x2="52%" y2="14%" stroke="rgba(255,255,255,0.25)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <line x1="32%" y1="58%" x2="20%" y2="74%" stroke="rgba(255,255,255,0.25)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
        <div
          className="absolute w-[80px] h-[80px] lg:w-[100px] lg:h-[100px] border border-white/80 anim-scale-in"
          style={{ top: "27%", left: "60%", animationDelay: "1500ms" }}
        />
        <div
          className="absolute w-[80px] h-[80px] lg:w-[100px] lg:h-[100px] border border-white/80 anim-scale-in"
          style={{ top: "58%", left: "32%", animationDelay: "1800ms" }}
        />
      </div>

      <div className="relative z-10 w-full min-h-dvh flex flex-col">
        <nav className="w-full flex items-center px-5 md:px-[35px] py-5 md:py-[27px]">
          <Link
            to="/"
            className="font-graphik text-white text-[18px] md:text-[21px] leading-[21px] whitespace-nowrap anim-fade-up"
            style={{ animationDelay: "200ms" }}
          >
            HerSpace
          </Link>
          <div
            className="hidden lg:flex items-center gap-[12px] ml-auto anim-slide-right"
            style={{ animationDelay: "600ms" }}
          >
            <span className="font-manrope text-white text-[13px] leading-[15.6px]">PRIVATE BY DESIGN</span>
            <span className="font-manrope text-[#AFDDFF] text-[13px] leading-[15.6px]">[ VERIFIED ]</span>
            <span className="font-manrope text-black text-[13px] leading-[15.6px] bg-[#AFDDFF] rounded-[3px] px-[5px] py-[2px] ml-[20px]">
              WOMEN_ONLY
            </span>
          </div>
        </nav>

        <div className="flex-1 flex items-center justify-center md:justify-between gap-10 px-5 md:px-[35px] lg:px-[60px] pb-10">
          <div className="hidden md:flex flex-col justify-center max-w-md">
            <p
              className="font-graphik font-normal text-white text-[32px] lg:text-[48px] leading-[1.05em] anim-slide-left"
              style={{ animationDelay: "1100ms" }}
            >
              "A quiet room for your health, shared with those you trust."
            </p>
            <p
              className="mt-6 font-manrope text-white/60 text-[12px] uppercase tracking-[0.2em] anim-fade-up"
              style={{ animationDelay: "1300ms" }}
            >
              Verified women-only · Zero-knowledge privacy
            </p>
            <p
              className="mt-8 font-manrope text-white/40 text-[12px] leading-[18px] max-w-sm anim-fade-in"
              style={{ animationDelay: "1500ms" }}
            >
              HerSpace does not replace professional medical advice, legal counsel, or emergency
              services.
            </p>
          </div>
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md p-6 md:p-8 space-y-6 anim-slide-right"
            style={{ animationDelay: "500ms" }}
          >
            <div className="anim-fade-up" style={{ animationDelay: "600ms" }}>
              <h1 className="font-graphik font-normal text-white text-[32px] md:text-[40px] leading-[1em]">
                {mode === "signin" ? "Welcome back." : "Join HerSpace."}
              </h1>
              <p className="mt-2 font-manrope text-white/60 text-[13px] leading-[18px]">
                {mode === "signin"
                  ? "Sign in to your space."
                  : "Create your account — it takes a minute."}
              </p>
            </div>

            <div className="space-y-2 anim-fade-up" style={{ animationDelay: "700ms" }}>
              <Button
                type="button"
                className="w-full rounded-full h-11 bg-white text-black hover:bg-[#AFDDFF]"
                onClick={handleGoogle}
                disabled={loading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full rounded-full h-9 font-manrope text-xs text-white/60 hover:text-[#AFDDFF] hover:bg-transparent"
                onClick={handleDemoSignIn}
                disabled={loading}
              >
                Instant Guest / Demo Access →
              </Button>
            </div>

            <div className="flex items-center gap-3 anim-fade-in" style={{ animationDelay: "800ms" }}>
              <span className="h-px flex-1 bg-white/10" />
              <span className="font-manrope text-[11px] uppercase tracking-widest text-white/40">or</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 anim-fade-up" style={{ animationDelay: "900ms" }}>
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white/70">Your name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={60}
                    required
                    className="bg-white/5 border-white/15 text-white placeholder:text-white/40"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/70">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="bg-white/5 border-white/15 text-white placeholder:text-white/40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/70">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="bg-white/5 border-white/15 text-white placeholder:text-white/40"
                />
              </div>
              <Button
                type="submit"
                className="w-full rounded-full h-11 bg-[#AFDDFF] text-black hover:bg-[#c8e8ff]"
                disabled={loading}
              >
                {loading ? "..." : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <p className="font-manrope text-[13px] text-center text-white/60 anim-fade-in" style={{ animationDelay: "1100ms" }}>
              {mode === "signin" ? "New to HerSpace? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="text-[#AFDDFF] font-medium hover:underline"
              >
                {mode === "signin" ? "Join now" : "Sign in"}
              </button>
            </p>
            <p className="font-manrope text-[11px] text-center text-white/40">
              <Link to="/privacy" className="hover:text-[#AFDDFF] hover:underline">
                Privacy
              </Link>
              <span className="mx-2">·</span>
              <Link to="/terms" className="hover:text-[#AFDDFF] hover:underline">
                Terms
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
