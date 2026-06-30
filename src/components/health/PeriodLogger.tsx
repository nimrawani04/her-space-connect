import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FLOW_OPTIONS, BLOOD_COLORS, CLOTTING_OPTIONS, PERIOD_SYMPTOMS, summarizeCycles } from "@/lib/cycle-stats";

type Severity = 1 | 2 | 3;

export function PeriodLogger() {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [flowIntensity, setFlowIntensity] = useState<string>("");
  const [bloodColor, setBloodColor] = useState("");
  const [clotting, setClotting] = useState("");
  const [pain, setPain] = useState<number>(0);
  const [cramp, setCramp] = useState<number>(0);
  const [symptoms, setSymptoms] = useState<Record<string, Severity>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase
      .from("cycle_entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .limit(60);
    setHistory(data ?? []);
  }
  useEffect(() => { load(); }, []);

  function toggleSymptom(s: string) {
    setSymptoms((cur) => {
      const v = cur[s];
      const next = { ...cur };
      if (!v) next[s] = 1;
      else if (v === 1) next[s] = 2;
      else if (v === 2) next[s] = 3;
      else delete next[s];
      return next;
    });
  }

  async function save() {
    if (!flowIntensity) { toast.error("Pick a flow level."); return; }
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Sign in required"); setLoading(false); return; }
    const { error } = await supabase.from("cycle_entries").upsert({
      user_id: u.user.id,
      entry_date: startDate,
      end_date: endDate || null,
      is_period_start: true,
      flow_intensity: flowIntensity,
      flow: flowIntensity,
      blood_color: bloodColor || null,
      clotting: clotting || null,
      pain_level: pain,
      cramp_level: cramp,
      period_symptoms: Object.keys(symptoms).length ? symptoms : null,
      notes: notes || null,
    }, { onConflict: "user_id,entry_date" });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Period logged.");
    setSymptoms({}); setNotes(""); setEndDate(""); setBloodColor(""); setClotting(""); setPain(0); setCramp(0);
    load();
  }

  const stats = summarizeCycles(history);

  const sevTone: Record<Severity, string> = {
    1: "bg-sage/20 text-sage border-sage/40",
    2: "bg-amber-100 text-amber-900 border-amber-300",
    3: "bg-rose-100 text-rose-900 border-rose-300",
  };
  const sevLabel: Record<Severity, string> = { 1: "mild", 2: "moderate", 3: "severe" };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <Card className="lg:col-span-3">
        <CardHeader><CardTitle className="font-serif italic text-2xl">Log a period</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Start date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div><Label>End date (optional)</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} /></div>
          </div>

          <div>
            <Label>Flow intensity</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {FLOW_OPTIONS.map((f) => (
                <button key={f} type="button" onClick={() => setFlowIntensity(f)}
                  className={`px-3 py-1.5 rounded-full text-xs border capitalize ${flowIntensity === f ? "bg-earth text-earth-foreground border-earth" : "bg-background border-border hover:border-earth/40"}`}>
                  {f.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Blood color</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {BLOOD_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setBloodColor(c)}
                    className={`px-2.5 py-1 rounded-full text-xs border capitalize ${bloodColor === c ? "bg-earth text-earth-foreground border-earth" : "bg-background border-border hover:border-earth/40"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Clotting</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {CLOTTING_OPTIONS.map((c) => (
                  <button key={c} type="button" onClick={() => setClotting(c)}
                    className={`px-2.5 py-1 rounded-full text-xs border capitalize ${clotting === c ? "bg-earth text-earth-foreground border-earth" : "bg-background border-border hover:border-earth/40"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label>Pain level — <span className="text-earth font-medium">{pain}/10</span></Label>
            <Slider value={[pain]} min={0} max={10} step={1} onValueChange={(v) => setPain(v[0])} className="mt-2" />
          </div>

          <div>
            <Label>
              Cramp level — <span className="text-earth font-medium">{cramp}/10</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {cramp === 0 ? "none" : cramp <= 3 ? "mild" : cramp <= 6 ? "moderate" : cramp <= 8 ? "strong" : "severe"}
              </span>
            </Label>
            <Slider value={[cramp]} min={0} max={10} step={1} onValueChange={(v) => setCramp(v[0])} className="mt-2" />
            <p className="text-[11px] text-muted-foreground mt-1">Rate cramps separately from overall pain — sharper signal for phase correlations.</p>
          </div>

          <div>
            <Label>Symptoms</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {PERIOD_SYMPTOMS.map((s) => {
                const sev = symptoms[s];
                return (
                  <button key={s} type="button" onClick={() => toggleSymptom(s)}
                    className={`px-2.5 py-1 rounded-full text-xs border capitalize ${sev ? sevTone[sev] : "bg-sand/40 text-earth border-transparent hover:border-earth/30"}`}>
                    {s.replace("_", " ")}{sev && <span className="ml-1 opacity-70">· {sevLabel[sev]}</span>}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">Tap once for mild, again for moderate, again for severe, again to clear.</p>
          </div>

          <div><Label>Notes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <Button onClick={save} disabled={loading} className="w-full rounded-full bg-earth text-earth-foreground hover:brightness-110">
            {loading ? "Saving…" : "Save period"}
          </Button>
        </CardContent>
      </Card>

      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader><CardTitle className="font-serif italic">Your averages</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Cycles tracked" value={String(stats.cycleCount)} />
            <Row label="Avg cycle" value={stats.avgCycle ? `${stats.avgCycle} days` : "—"} />
            <Row label="Avg period" value={stats.avgPeriod ? `${stats.avgPeriod} days` : "—"} />
            <Row label="Avg flow" value={stats.flow?.label ?? "—"} />
            <Row label="Regularity" value={stats.regularity?.label ?? "—"} />
            <Row label="Longest" value={stats.longest ? `${stats.longest} d` : "—"} />
            <Row label="Shortest" value={stats.shortest ? `${stats.shortest} d` : "—"} />
            <Row label="Days since last" value={stats.daysSinceLast != null ? `${stats.daysSinceLast} d` : "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-serif italic">Recent periods</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[320px] overflow-auto text-sm">
            {history.filter((h) => h.flow_intensity || h.is_period_start).slice(0, 12).map((h) => (
              <div key={h.id} className="rounded-lg border border-border p-2.5">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{h.entry_date}{h.end_date ? ` → ${h.end_date}` : ""}</span>
                  {h.flow_intensity && <Badge variant="outline" className="capitalize">{(h.flow_intensity as string).replace("_", " ")}</Badge>}
                </div>
                {(h.pain_level != null || h.cramp_level != null) && (
                  <p className="text-muted-foreground mt-0.5">
                    {h.pain_level != null && <>Pain: {h.pain_level}/10</>}
                    {h.pain_level != null && h.cramp_level != null && " · "}
                    {h.cramp_level != null && <>Cramps: {h.cramp_level}/10</>}
                  </p>
                )}
              </div>
            ))}
            {!history.filter((h) => h.flow_intensity || h.is_period_start).length && (
              <p className="text-muted-foreground">No periods logged yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/50 pb-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}