import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { AlertTriangle, Footprints, Timer } from "lucide-react";
import {
  TRIMESTERS, weekInfo, gestationalAge, trimesterOf, LABOR_WARNING_SIGNS,
  BIRTH_PLAN_PROMPTS, MEDICAL_DISCLAIMER,
} from "@/lib/pregnancy";
import type { PregnancyProfile } from "@/hooks/use-pregnancy-profile";

export function Journey({
  profile, save,
}: { profile: PregnancyProfile; save: (p: Partial<PregnancyProfile>) => Promise<PregnancyProfile> }) {
  const currentWeek = profile.lmp_date ? Math.min(40, Math.max(1, gestationalAge(profile.lmp_date).weeks)) : 1;
  const [week, setWeek] = useState(currentWeek);
  useEffect(() => { setWeek(currentWeek); }, [currentWeek]);

  const info = useMemo(() => weekInfo(week), [week]);
  const tri = TRIMESTERS.find((t) => t.n === info.trimester)!;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="font-serif italic text-2xl">Week {info.week} · {tri.emoji} {tri.label}</CardTitle>
            <Badge variant="outline">{tri.range}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <Progress value={(info.week / 40) * 100} className="h-2" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 40 }, (_, i) => i + 1).map((w) => (
              <button
                key={w}
                onClick={() => setWeek(w)}
                aria-current={w === week}
                className={`h-8 w-8 rounded-full text-xs transition-colors ${
                  w === week ? "bg-primary text-primary-foreground" :
                  w === currentWeek ? "border border-primary text-primary" :
                  trimesterOf(w) === info.trimester ? "bg-muted text-foreground/80 hover:bg-accent" : "text-muted-foreground hover:bg-accent"
                }`}
              >{w}</button>
            ))}
          </div>

          {info.size && <p className="text-sm text-muted-foreground">Your baby is about the size of a <span className="font-medium text-foreground">{info.size}</span>.</p>}

          <div className="grid md:grid-cols-2 gap-4">
            <Section title="Baby development" body={info.baby} />
            <Section title="Your body" body={info.mother} />
            <List title="Symptoms you may notice" items={info.symptoms} />
            <List title="Nutrition focus" items={info.nutrition} />
            <List title="Exercises" items={info.exercise} />
            <List title="Medical tests" items={info.tests} />
            <List title="Do's" items={info.dos} />
            <List title="Don'ts" items={info.donts} />
            <List title="Medicines & supplements" items={info.meds} />
          </div>

          <p className="text-xs text-muted-foreground">{MEDICAL_DISCLAIMER}</p>
        </CardContent>
      </Card>

      {info.trimester >= 2 && <KickCounter week={info.week} />}
      {info.trimester === 3 && <ContractionTimer />}
      {info.trimester === 3 && <BirthPlan profile={profile} save={save} />}

      <Card>
        <CardHeader><CardTitle className="font-serif italic text-2xl flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Emergency warning signs</CardTitle></CardHeader>
        <CardContent>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm">
            {LABOR_WARNING_SIGNS.map((s) => <li key={s} className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2">{s}</li>)}
          </ul>
          <p className="text-xs text-muted-foreground mt-3">Any of these means: contact your maternity unit immediately.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{title}</p>
      <p className="text-sm mt-2 leading-relaxed">{body}</p>
    </div>
  );
}
function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{title}</p>
      <ul className="text-sm mt-2 space-y-1 list-disc pl-4">{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </div>
  );
}

function KickCounter({ week }: { week: number }) {
  const [start, setStart] = useState<number | null>(null);
  const [kicks, setKicks] = useState(0);
  const [sessions, setSessions] = useState<{ id: string; started_at: string; ended_at: string | null; kicks: number }[]>([]);

  async function load() {
    const { data } = await supabase.from("kick_counts").select("id, started_at, ended_at, kicks").order("started_at", { ascending: false }).limit(8);
    setSessions((data as typeof sessions) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function finish() {
    if (!start) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Sign in required"); return; }
    const { error } = await supabase.from("kick_counts").insert({
      user_id: u.user.id, started_at: new Date(start).toISOString(), ended_at: new Date().toISOString(), kicks, week,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Session saved — ${kicks} movements.`);
    setStart(null); setKicks(0); load();
  }

  const mins = start ? Math.round((Date.now() - start) / 60000) : 0;

  return (
    <Card>
      <CardHeader><CardTitle className="font-serif italic text-2xl flex items-center gap-2"><Footprints className="h-5 w-5" /> Kick counter</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Most clinicians suggest counting 10 movements; many people feel them within two hours. Fewer movements than usual? Call your maternity unit.</p>
        {start ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" className="rounded-full h-20 w-20 text-lg" onClick={() => setKicks((k) => k + 1)}>{kicks}</Button>
            <span className="text-sm text-muted-foreground">started ~{mins} min ago</span>
            <Button variant="outline" className="rounded-full" onClick={finish}>Finish & save</Button>
            <Button variant="ghost" className="rounded-full" onClick={() => { setStart(null); setKicks(0); }}>Cancel</Button>
          </div>
        ) : (
          <Button className="rounded-full" onClick={() => { setStart(Date.now()); setKicks(0); }}>Start counting</Button>
        )}
        <div className="space-y-1 text-sm">
          {sessions.map((s) => (
            <div key={s.id} className="flex justify-between border-b border-border/60 py-1">
              <span className="text-muted-foreground">{new Date(s.started_at).toLocaleString()}</span>
              <span>{s.kicks} movements</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ContractionTimer() {
  const [runningSince, setRunningSince] = useState<number | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [rows, setRows] = useState<{ id: string; started_at: string; duration_seconds: number; intensity: number | null }[]>([]);

  async function load() {
    const { data } = await supabase.from("contractions").select("id, started_at, duration_seconds, intensity").order("started_at", { ascending: false }).limit(10);
    setRows((data as typeof rows) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function stop() {
    if (!runningSince) return;
    const duration = Math.round((Date.now() - runningSince) / 1000);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Sign in required"); return; }
    const { error } = await supabase.from("contractions").insert({
      user_id: u.user.id, started_at: new Date(runningSince).toISOString(), duration_seconds: duration, intensity,
    });
    setRunningSince(null);
    if (error) { toast.error(error.message); return; }
    load();
  }

  const gaps = rows.slice(0, 5).map((r, i, a) =>
    i < a.length - 1 ? Math.round((new Date(r.started_at).getTime() - new Date(a[i + 1].started_at).getTime()) / 60000) : null);
  const avgGap = gaps.filter((g): g is number => g != null);
  const pattern = avgGap.length ? Math.round(avgGap.reduce((a, b) => a + b, 0) / avgGap.length) : null;

  return (
    <Card>
      <CardHeader><CardTitle className="font-serif italic text-2xl flex items-center gap-2"><Timer className="h-5 w-5" /> Contraction timer</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Intensity (1–10): {intensity}</Label>
          <Slider min={1} max={10} step={1} value={[intensity]} onValueChange={(v) => setIntensity(v[0])} className="mt-2" />
        </div>
        {runningSince
          ? <Button className="rounded-full" onClick={stop}>Stop contraction</Button>
          : <Button className="rounded-full" onClick={() => setRunningSince(Date.now())}>Start contraction</Button>}
        {pattern != null && (
          <Alert>
            <AlertTitle>Pattern</AlertTitle>
            <AlertDescription>About {pattern} minutes apart. Call your maternity unit when contractions are ~5 minutes apart, lasting a minute, for an hour — or sooner if advised.</AlertDescription>
          </Alert>
        )}
        <div className="space-y-1 text-sm">
          {rows.map((r) => (
            <div key={r.id} className="flex justify-between border-b border-border/60 py-1">
              <span className="text-muted-foreground">{new Date(r.started_at).toLocaleTimeString()}</span>
              <span>{r.duration_seconds}s · intensity {r.intensity ?? "—"}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BirthPlan({ profile, save }: { profile: PregnancyProfile; save: (p: Partial<PregnancyProfile>) => Promise<PregnancyProfile> }) {
  const [text, setText] = useState(profile.birth_plan ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <CardHeader><CardTitle className="font-serif italic text-2xl">Birth plan & hospital preparation</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <ul className="text-sm list-disc pl-5 space-y-1 text-muted-foreground">
          {BIRTH_PLAN_PROMPTS.map((p) => <li key={p}>{p}</li>)}
        </ul>
        <Textarea rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your preferences here…" maxLength={5000} />
        <Button
          className="rounded-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try { await save({ birth_plan: text }); toast.success("Birth plan saved."); }
            catch (e) { toast.error(e instanceof Error ? e.message : "Could not save"); }
            finally { setBusy(false); }
          }}
        >Save birth plan</Button>
      </CardContent>
    </Card>
  );
}