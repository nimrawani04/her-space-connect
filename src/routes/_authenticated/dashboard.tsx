import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { data: p } = await supabase.from("profiles").select("display_name").eq("id", u.user.id).maybeSingle();
        setName(p?.display_name ?? u.user.email?.split("@")[0] ?? "Sister");
      }
      const { count } = await supabase.from("community_posts").select("id", { count: "exact", head: true });
      setPostCount(count ?? 0);
    })();
  }, []);

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">{today}</p>
        <h1 className="text-4xl md:text-5xl font-serif italic">Good morning, {name}.</h1>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 bg-card">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="font-serif italic text-2xl">Today's cycle</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Log a quick check-in to see patterns over time.</p>
            </div>
            <Badge variant="outline" className="border-earth text-earth">Follicular</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-2 rounded-full bg-muted overflow-hidden mb-4"><div className="h-full w-2/5 bg-earth" /></div>
            <Button asChild className="rounded-full"><Link to="/health">Open Health Hub</Link></Button>
          </CardContent>
        </Card>

        <Card className="bg-sage/5 ring-1 ring-sage/20">
          <CardHeader>
            <CardTitle className="font-serif italic text-2xl">Journal prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="font-serif italic text-lg">"What boundary served you best yesterday?"</p>
            <Button asChild variant="outline" className="rounded-full"><Link to="/wellness">Write now</Link></Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="font-serif italic text-2xl">Community feed</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{postCount ?? "—"} conversations happening now across Safe Space.</p>
            <Button asChild variant="outline" className="rounded-full"><Link to="/community">Enter Safe Space</Link></Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-serif italic text-2xl">Mentor match</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Browse verified women leaders by field.</p>
            <Button asChild variant="outline" className="rounded-full"><Link to="/mentorship">Find a mentor</Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}