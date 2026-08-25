import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { hasSupabaseBrowserConfig } from "@/integrations/supabase/config";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  completeAuthRedirect,
  rememberAuthDestination,
  waitForAuthenticatedUser,
} from "@/lib/auth-redirect";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in · HerSpace" },
      { name: "description", content: "Sign in to HerSpace — a women-only ecosystem for health, safety, mentorship, and sisterhood." },
    ],
  }),
  component: AuthPage,
});

const credSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(72),
  displayName: z.string().trim().min(1).max(60).optional(),
});

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasSupabaseBrowserConfig()) return;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) navigate({ to: "/dashboard" });
      })
      .catch(() => {});
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = credSchema.safeParse({ email, password, displayName: mode === "signup" ? name : undefined });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
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
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    rememberAuthDestination("/dashboard");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth/callback`,
      extraParams: { prompt: "select_account" },
    });
    if (result.error) {
      toast.error("Google sign-in failed.");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    const user = await waitForAuthenticatedUser();
    if (user) {
      completeAuthRedirect();
      return;
    }
    toast.error("Your sign-in completed, but the session could not be confirmed. Please try again.");
    setLoading(false);
  }

  return (
    <div className="min-h-dvh grid md:grid-cols-2 text-foreground">
      <div className="hidden md:flex flex-col justify-between p-12 bg-foreground text-background">
        <Link to="/" className="font-serif text-3xl italic">HerSpace</Link>
        <div className="max-w-md">
          <p className="font-serif italic text-3xl leading-snug">
            "A quiet room for your health, shared with those you trust."
          </p>
          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-background/60">
            Verified women-only · Zero-knowledge privacy
          </p>
        </div>
        <p className="text-xs text-background/50 max-w-sm">
          HerSpace does not replace professional medical advice, legal counsel, or emergency services.
        </p>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-4xl font-serif italic">{mode === "signin" ? "Welcome back." : "Join HerSpace."}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "signin" ? "Sign in to your space." : "Create your account — it takes a minute."}
            </p>
          </div>

          <Button type="button" variant="outline" className="w-full rounded-full h-11" onClick={handleGoogle} disabled={loading}>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest"><span className="bg-background px-2 text-muted-foreground">or</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            </div>
            <Button type="submit" className="w-full rounded-full h-11 bg-earth text-earth-foreground hover:brightness-110" disabled={loading}>
              {loading ? "..." : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground">
            {mode === "signin" ? "New to HerSpace? " : "Already have an account? "}
            <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-earth font-medium hover:underline">
              {mode === "signin" ? "Join now" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}