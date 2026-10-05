import { createFileRoute, Link, useNavigate, useSearch, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { HerSpaceLogo } from "@/components/brand/HerSpaceLogo";
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
      { property: "og:url", content: "https://her-space-connect.vercel.app/auth" },
    ],
    links: [{ rel: "canonical", href: "https://her-space-connect.vercel.app/auth" }],
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
    <section className="relative w-full h-screen max-h-screen overflow-hidden bg-[#100609] text-[#fbf6f5] font-sans flex flex-col justify-between">
      {/* Background cinematic video with dark rich contrast and glowing pink flower blend */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <video
          className="w-full h-full object-cover filter contrast-[1.18] brightness-[1.05]"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_115057_94c3699b-0fd1-4124-bcf3-3626bb8c1f77.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        {/* Pink Flower Color Blend */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-color"
          style={{
            background:
              "radial-gradient(ellipse 80% 80% at 55% 45%, #ff4d88 0%, #f43f5e 35%, #ec4899 65%, #9d174d 100%)",
            opacity: 0.95,
          }}
        />
        {/* Pink Glow Blend */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-screen"
          style={{
            background:
              "radial-gradient(circle at 55% 45%, rgba(255, 130, 175, 0.4) 0%, rgba(244, 114, 182, 0.25) 40%, rgba(219, 39, 119, 0.15) 70%, transparent 100%)",
            opacity: 0.85,
          }}
        />
        {/* Deep dark botanical vignette for dark atmospheric contrast and legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#100609]/80 via-[#100609]/45 to-[#0e0508]/88 pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-[30rem] h-[30rem] rounded-full bg-[#f472b6]/15 blur-[130px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-[32rem] h-[32rem] rounded-full bg-[#fb7185]/15 blur-[140px] pointer-events-none" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 w-full flex items-center justify-between px-6 md:px-12 py-3.5 sm:py-4 border-b border-white/[0.06] backdrop-blur-xs shrink-0">
        <Link
          to="/"
          className="flex items-center gap-2.5 font-serif italic text-2xl text-white tracking-tight"
        >
          <HerSpaceLogo size={30} />
          <span>HerSpace</span>
        </Link>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[#f472b6]/15 border border-[#f472b6]/30 text-pink-200">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f472b6] animate-pulse" />
          Women&apos;s Sanctuary
        </div>
      </nav>

      {/* Center Content */}
      <div className="relative z-10 flex-1 flex items-center justify-between px-6 sm:px-10 md:px-16 py-2 sm:py-3 w-full max-w-7xl mx-auto overflow-hidden">
        <div className="flex flex-col lg:flex-row items-center justify-between w-full gap-8 lg:gap-14">
          {/* Left Poetic Message */}
          <div className="hidden md:flex flex-col justify-center space-y-4 lg:space-y-5 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-pink-300/20 text-xs text-pink-200 w-fit">
              <span>Private &middot; Sovereign &middot; Protected</span>
            </div>
            <h2 className="font-serif italic text-2xl sm:text-3xl lg:text-4xl xl:text-5xl text-white leading-tight">
              &ldquo;A quiet room for your health, shared with those you trust.&rdquo;
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 font-light leading-relaxed max-w-md">
              Connect your cycle data, explore safe community zones, and find sisters walking the same path — in a space where women always come first.
            </p>
            <div className="flex items-center gap-5 pt-1 text-xs text-stone-300">
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">&#10003;</span> Zero data sales
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">&#10003;</span> Instant demo
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">&#10003;</span> Encrypted logs
              </span>
            </div>
          </div>

          {/* Right Auth Card — shifted towards the right corner, compact to prevent any page scrolling */}
          <div className="w-full max-w-[420px] ml-auto mr-0 md:mr-2 lg:mr-4 rounded-3xl border border-pink-300/20 bg-[#160a10]/85 backdrop-blur-2xl p-5 sm:p-7 shadow-2xl shadow-pink-950/40 space-y-3.5 shrink-0">
            <div>
              <h1 className="font-serif italic text-2xl sm:text-3xl text-white">
                {mode === "signin" ? "Welcome back, sister." : "Join the sisterhood."}
              </h1>
              <p className="mt-1 text-xs text-stone-300 font-light">
                {mode === "signin"
                  ? "Enter your sanctuary."
                  : "Create your private profile in just a minute."}
              </p>
            </div>

            {/* Quick Google & Demo Options */}
            <div className="space-y-2">
              <Button
                type="button"
                className="w-full rounded-full h-10 bg-white text-stone-900 hover:bg-stone-100 font-medium text-xs sm:text-sm shadow-sm transition-all"
                onClick={handleGoogle}
                disabled={loading}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
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
                className="w-full rounded-full h-8 text-xs text-pink-300 hover:text-pink-100 hover:bg-white/[0.08]"
                onClick={handleDemoSignIn}
                disabled={loading}
              >
                Instant Guest / Demo Access &rarr;
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] uppercase tracking-widest text-stone-400">or with email</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-2.5">
              {mode === "signup" && (
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs text-stone-300">Your First Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Nimra Wani"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={60}
                    required
                    className="rounded-xl h-9 text-xs sm:text-sm bg-white/[0.06] border-white/15 text-white placeholder:text-stone-500 focus-visible:ring-pink-400/50"
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs text-stone-300">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="sister@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="rounded-xl h-9 text-xs sm:text-sm bg-white/[0.06] border-white/15 text-white placeholder:text-stone-500 focus-visible:ring-pink-400/50"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs text-stone-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="rounded-xl h-9 text-xs sm:text-sm bg-white/[0.06] border-white/15 text-white placeholder:text-stone-500 focus-visible:ring-pink-400/50"
                />
              </div>
              <Button
                type="submit"
                className="w-full rounded-full h-10 bg-gradient-to-r from-[#ff7597] to-[#f472b6] hover:from-[#ff9ebb] hover:to-[#fbcfe8] text-[#14060c] font-bold text-xs sm:text-sm shadow-md shadow-pink-950/40 hover:scale-[1.01] active:scale-[0.99] transition-all"
                disabled={loading}
              >
                {loading ? "Please wait..." : mode === "signin" ? "Sign in to HerSpace" : "Create Account"}
              </Button>
            </form>

            <div className="pt-1 text-center space-y-1.5">
              <p className="text-xs text-stone-300">
                {mode === "signin" ? "New to HerSpace? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="text-[#f472b6] font-semibold hover:underline"
                >
                  {mode === "signin" ? "Join now" : "Sign in"}
                </button>
              </p>
              <p className="text-[11px] text-stone-400">
                <Link to="/privacy" className="hover:text-pink-200 hover:underline">
                  Privacy
                </Link>
                <span className="mx-2">&middot;</span>
                <Link to="/terms" className="hover:text-pink-200 hover:underline">
                  Terms
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal Footer */}
      <div className="relative z-10 py-2.5 text-center text-[11px] text-stone-400 border-t border-white/[0.06] shrink-0">
        HerSpace &middot; Built exclusively for women&apos;s health, privacy, and empowerment.
      </div>
    </section>
  );
}
