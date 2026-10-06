import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hasSupabaseBrowserConfig } from "@/integrations/supabase/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · HerSpace" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [name, setName] = useState("Sister");
  const [postCount, setPostCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      if (hasSupabaseBrowserConfig()) {
        try {
          const { data: u } = await supabase.auth.getUser();
          if (u?.user) {
            const { data: p } = await supabase.from("profiles").select("display_name").eq("id", u.user.id).maybeSingle();
            setName(p?.display_name ?? u.user.email?.split("@")[0] ?? "Sister");
          }
          const { count } = await supabase.from("community_posts").select("id", { count: "exact", head: true });
          setPostCount(count ?? 0);
          return;
        } catch {}
      }
      const demoUserStr = localStorage.getItem("herspace_demo_user");
      if (demoUserStr) {
        try {
          const demoUser = JSON.parse(demoUserStr);
          setName(demoUser.name || demoUser.email?.split("@")[0] || "Sister");
        } catch {}
      }
      setPostCount(12);
    })();
  }, []);

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Warm Sanctuary Greeting Header */}
      <header className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-primary/10 via-secondary/40 to-background border border-primary/15 shadow-sm overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold font-sans">{today}</p>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif italic text-foreground tracking-tight">
              {greeting}, {name}.
            </h1>
            <p className="text-sm text-muted-foreground mt-2 font-sans font-light max-w-xl">
              Welcome back to your quiet room. Your cycle, sisterhood, and wellness space are waiting for you.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button asChild size="sm" className="rounded-full shadow-xs">
              <Link to="/health">Check In Today</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link to="/wellness">Journal Entry</Link>
            </Button>
          </div>
        </div>
        {/* Soft background ambient floral glow */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      </header>

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Cycle & Body Card */}
        <Card className="md:col-span-2 relative overflow-hidden group hover:border-primary/30 transition-all">
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Body &amp; Rhythm</span>
              </div>
              <CardTitle className="font-serif italic text-2xl text-foreground">Today's Cycle Phase</CardTitle>
              <p className="text-sm text-muted-foreground font-light">
                Log a quick check-in to see emotional, hormonal, and physical patterns over time.
              </p>
            </div>
            <Badge variant="soft" className="px-3 py-1 text-xs">
              Follicular Phase
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span>Phase Progress</span>
                <span className="text-primary font-semibold">Day 8 of 28</span>
              </div>
              <div className="h-2.5 rounded-full bg-secondary/80 overflow-hidden p-0.5">
                <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500" />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <p className="text-xs text-muted-foreground italic">
                Energy and mental focus often rise during this phase. Be gentle with yourself.
              </p>
              <Button asChild className="rounded-full" size="sm">
                <Link to="/health">Open Health Hub &rarr;</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Daily Journal Prompt */}
        <Card className="bg-gradient-to-br from-sage/10 via-card to-card border-sage/20 relative overflow-hidden group hover:border-sage/40 transition-all flex flex-col justify-between">
          <CardHeader className="pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-sage dark:text-emerald-300">
              Mind &amp; Reflection
            </span>
            <CardTitle className="font-serif italic text-2xl text-foreground mt-1">
              Today's Journal Prompt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
            <p className="font-serif italic text-lg text-foreground/90 leading-relaxed bg-background/50 p-4 rounded-2xl border border-border/50">
              &ldquo;What boundary served your peace best yesterday?&rdquo;
            </p>
            <Button asChild variant="outline" className="rounded-full w-full">
              <Link to="/wellness">Reflect &amp; Write</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Sisterhood Safe Space Community Card */}
        <Card className="md:col-span-2 group hover:border-primary/30 transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Safe Space Sisterhood</span>
              <span className="text-xs text-muted-foreground font-medium">100% Private Circle</span>
            </div>
            <CardTitle className="font-serif italic text-2xl text-foreground mt-1">Community &amp; Shared Wisdom</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground font-light leading-relaxed">
              {postCount ?? 12} supportive conversations are taking place right now across Safe Space. Share questions anonymously or lend advice to a sister.
            </p>
            <div className="flex items-center gap-3">
              <Button asChild variant="default" className="rounded-full" size="sm">
                <Link to="/community">Enter Safe Space</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full" size="sm">
                <Link to="/experience">Find an Experience Match</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Mentorship */}
        <Card className="group hover:border-primary/30 transition-all flex flex-col justify-between">
          <CardHeader className="pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sisterhood Network</span>
            <CardTitle className="font-serif italic text-2xl text-foreground mt-1">Mentor Match</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
            <p className="text-sm text-muted-foreground font-light leading-relaxed">
              Connect with experienced women leaders, founders, and guides ready to support your career and life goals.
            </p>
            <Button asChild variant="outline" className="rounded-full w-full">
              <Link to="/mentorship">Browse Mentors &rarr;</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}