import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hasSupabaseBrowserConfig } from "@/integrations/supabase/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, Sparkles, GraduationCap, ArrowRight, HeartHandshake, Baby, Activity, Microscope } from "lucide-react";

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
      <header className="relative p-4 sm:p-6 md:p-8 rounded-3xl bg-gradient-to-br from-primary/15 via-secondary/30 to-card/60 backdrop-blur-md border border-primary/20 shadow-sm overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold font-sans">{today}</p>
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif italic text-foreground tracking-tight">
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
          <CardHeader className="p-4 sm:p-6 pb-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Body &amp; Rhythm</span>
              <Badge variant="soft" className="px-3 py-1 text-xs whitespace-nowrap shrink-0">
                Follicular Phase
              </Badge>
            </div>
            <CardTitle className="font-serif italic text-2xl sm:text-3xl text-foreground">Today's Cycle Phase</CardTitle>
            <p className="text-sm text-muted-foreground font-light">
              Log a quick check-in to see emotional, hormonal, and physical patterns over time.
            </p>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
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
          <CardHeader className="p-4 sm:p-6 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-sage dark:text-emerald-300">
              Mind &amp; Reflection
            </span>
            <CardTitle className="font-serif italic text-2xl text-foreground mt-1">
              Today's Journal Prompt
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4 flex-1 flex flex-col justify-between">
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
          <CardHeader className="p-4 sm:p-6 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Safe Space Sisterhood</span>
              <span className="text-xs text-muted-foreground font-medium">100% Private Circle</span>
            </div>
            <CardTitle className="font-serif italic text-2xl text-foreground mt-1">Community &amp; Shared Wisdom</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
            <p className="text-sm text-muted-foreground font-light leading-relaxed">
              {postCount ?? 12} supportive conversations are taking place right now across Safe Space. Share questions anonymously or lend advice to a sister.
            </p>
            <div className="flex flex-wrap items-center gap-3">
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
          <CardHeader className="p-4 sm:p-6 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sisterhood Network</span>
            <CardTitle className="font-serif italic text-2xl text-foreground mt-1">Mentor Match</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4 flex-1 flex flex-col justify-between">
            <p className="text-sm text-muted-foreground font-light leading-relaxed">
              Connect with experienced women leaders, founders, and guides ready to support your career and life goals.
            </p>
            <Button asChild variant="outline" className="rounded-full w-full">
              <Link to="/mentorship">Browse Mentors &rarr;</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Life Stages & Educational Academy Sanctuary Row */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-serif italic text-2xl text-foreground">Dedicated Life Stages &amp; Academy</h2>
            <p className="text-xs text-muted-foreground font-light mt-0.5">
              Comprehensive clinical tools and compassionate guides tailored to every stage of womanhood.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm" className="rounded-full text-xs text-primary self-start sm:self-auto">
            <Link to="/library">Explore All Courses &rarr;</Link>
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* AI Care Pathway Navigator (New Feature) */}
          <Card className="bg-gradient-to-br from-primary/15 via-card to-card border-primary/30 group hover:border-primary/50 transition-all flex flex-col justify-between shadow-xs">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <HeartHandshake className="w-3.5 h-3.5" /> Care Pathway
                </span>
                <Badge variant="outline" className="text-[10px] rounded-full border-primary/30 text-primary">
                  Non-Dismissive
                </Badge>
              </div>
              <CardTitle className="font-serif italic text-xl text-foreground mt-1">
                Tell Your Story &amp; Get A Pathway
              </CardTitle>
              <p className="text-xs text-muted-foreground font-light leading-relaxed mt-1">
                Can&apos;t afford private care or feeling dismissed? AI understands your barriers and maps public, low-cost &amp; community options.
              </p>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <Button asChild size="sm" className="rounded-full w-full text-xs bg-primary text-primary-foreground hover:brightness-105">
                <Link to="/wellness" search={{ tab: "talk" }}>
                  Find My Next Steps <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* At-Home Lab Test Integrations (New Feature) */}
          <Card className="bg-gradient-to-br from-teal-500/10 via-card to-card border-teal-500/20 group hover:border-teal-500/40 transition-all flex flex-col justify-between">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                  <Microscope className="w-3.5 h-3.5" /> Lab Kits
                </span>
                <Badge variant="outline" className="text-[10px] rounded-full border-teal-500/30 text-teal-600 dark:text-teal-400">
                  AMH &amp; Thyroid
                </Badge>
              </div>
              <CardTitle className="font-serif italic text-xl text-foreground mt-1">
                At-Home Lab Integrations
              </CardTitle>
              <p className="text-xs text-muted-foreground font-light leading-relaxed mt-1">
                Upload or log Modern Fertility, Everlywell, or clinic lab sheets for cycle-matched deep clinical insights.
              </p>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <Button asChild variant="outline" size="sm" className="rounded-full w-full text-xs hover:border-teal-500/50">
                <Link to="/health" search={{ tab: "labs" }}>
                  Analyze My Lab Kit <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Perimenopause Navigator */}
          <Card className="bg-gradient-to-br from-amber-500/10 via-card to-card border-amber-500/20 group hover:border-amber-500/40 transition-all flex flex-col justify-between">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" /> Midlife Longevity
                </span>
                <Badge variant="outline" className="text-[10px] rounded-full border-amber-500/30 text-amber-600 dark:text-amber-400">
                  STRAW+10
                </Badge>
              </div>
              <CardTitle className="font-serif italic text-xl text-foreground mt-1">
                Perimenopause Navigator
              </CardTitle>
              <p className="text-xs text-muted-foreground font-light leading-relaxed mt-1">
                Track vasomotor hot flashes, night sweats, sleep quality, brain fog, and calculate your clinical score.
              </p>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <Button asChild variant="outline" size="sm" className="rounded-full w-full text-xs hover:border-amber-500/50">
                <Link to="/health" search={{ tab: "perimenopause" }}>
                  Open Perimenopause Hub <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Teen & First Period Support */}
          <Card className="bg-gradient-to-br from-rose-500/10 via-card to-card border-rose-500/20 group hover:border-rose-500/40 transition-all flex flex-col justify-between">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <Baby className="w-3.5 h-3.5" /> Young Women
                </span>
                <Badge variant="outline" className="text-[10px] rounded-full border-rose-500/30 text-rose-600 dark:text-rose-400">
                  Shame-Free
                </Badge>
              </div>
              <CardTitle className="font-serif italic text-xl text-foreground mt-1">
                Teen &amp; First Period Hub
              </CardTitle>
              <p className="text-xs text-muted-foreground font-light leading-relaxed mt-1">
                Track puberty milestones, understand cycle variability (21-45 days), and pack your school emergency kit.
              </p>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <Button asChild variant="outline" size="sm" className="rounded-full w-full text-xs hover:border-rose-500/50">
                <Link to="/health" search={{ tab: "teen" }}>
                  Open Teen Sanctuary <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Educational Content Layer & Courses */}
          <Card className="bg-gradient-to-br from-primary/10 via-card to-card border-primary/20 group hover:border-primary/40 transition-all flex flex-col justify-between sm:col-span-2 lg:col-span-1">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" /> Academy &amp; Masterclasses
                </span>
                <Badge variant="outline" className="text-[10px] rounded-full border-primary/30 text-primary">
                  6 Courses
                </Badge>
              </div>
              <CardTitle className="font-serif italic text-xl text-foreground mt-1">
                Women&apos;s Knowledge Academy
              </CardTitle>
              <p className="text-xs text-muted-foreground font-light leading-relaxed mt-1">
                Expert-led video masterclasses, guided cycle audio, and multi-module academies for Fertility, Birth &amp; Cycle.
              </p>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <Button asChild variant="outline" className="rounded-full w-full text-xs hover:border-primary/50">
                <Link to="/library">
                  Browse Courses &amp; Audio <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}