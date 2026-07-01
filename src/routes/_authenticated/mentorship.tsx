import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mentorship")({
  head: () => ({ meta: [{ title: "Mentorship · HerSpace" }] }),
  component: Mentorship,
});

type Mentor = { id: string; user_id: string; headline: string; bio: string | null; expertise: string[]; hourly_rate: number | null; is_available: boolean };

function Mentorship() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [expertise, setExpertise] = useState("");
  const [rate, setRate] = useState("");

  async function load() {
    const { data } = await supabase.from("mentors").select("*").order("created_at", { ascending: false }).limit(50);
    setMentors((data as Mentor[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function become(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (headline.length < 5) { toast.error("Write a headline."); return; }
    const { error } = await supabase.from("mentors").upsert({
      user_id: u.user.id,
      headline, bio: bio || null,
      expertise: expertise.split(",").map((s) => s.trim()).filter(Boolean),
      hourly_rate: rate ? Number(rate) : null,
    }, { onConflict: "user_id" });
    if (error) { toast.error(error.message); return; }
    toast.success("You're listed as a mentor."); load();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-earth mb-2">04 · Growth</p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif italic">Mentorship</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">Connect with verified women leaders across engineering, medicine, research, AI, entrepreneurship, design, UPSC, and freelancing.</p>
      </header>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="self-start">
          <CardHeader><CardTitle className="font-serif italic">Become a mentor</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={become} className="space-y-3">
              <div><Label>Headline</Label><Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Senior PM at Stripe · ex-Google" /></div>
              <div><Label>Expertise (comma separated)</Label><Input value={expertise} onChange={(e) => setExpertise(e.target.value)} placeholder="product, AI, careers" /></div>
              <div><Label>Hourly rate (optional, USD)</Label><Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
              <div><Label>Bio</Label><Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} /></div>
              <Button type="submit" className="w-full rounded-full bg-earth text-earth-foreground hover:brightness-110">List me</Button>
            </form>
          </CardContent>
        </Card>
        <div className="md:col-span-2 grid sm:grid-cols-2 gap-4">
          {mentors.length === 0 && <Card className="sm:col-span-2"><CardContent className="p-8 text-center text-muted-foreground">No mentors listed yet. Be the first.</CardContent></Card>}
          {mentors.map((m) => (
            <Card key={m.id}>
              <CardHeader><CardTitle className="font-serif italic text-xl">{m.headline}</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {m.bio && <p className="text-muted-foreground">{m.bio}</p>}
                <div className="flex flex-wrap gap-1.5">{m.expertise.map((x) => <Badge key={x} variant="outline">{x}</Badge>)}</div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">{m.hourly_rate ? `$${m.hourly_rate}/hr` : "Free intro"}</span>
                  <Button size="sm" variant="outline" className="rounded-full">Request session</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}