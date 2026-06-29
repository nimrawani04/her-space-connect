import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDown } from "lucide-react";
import { buildHealthPdf } from "@/lib/pdf-report";
import { summarizeCycles, periodStarts } from "@/lib/cycle-stats";
import { toast } from "sonner";

type Range = "week" | "month" | "6mo" | "year";
const DAYS: Record<Range, number> = { week: 7, month: 30, "6mo": 180, year: 365 };

export function CycleDashboard() {
  const [range, setRange] = useState<Range>("month");
  const [cycles, setCycles] = useState<any[]>([]);
  const [wellness, setWellness] = useState<any[]>([]);

  async function load() {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - DAYS[range]);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const [c, w] = await Promise.all([
      supabase.from("cycle_entries").select("*").gte("entry_date", cutoffStr).order("entry_date", { ascending: true }),
      supabase.from("wellness_logs").select("*").gte("log_date", cutoffStr).order("log_date", { ascending: true }),
    ]);
    setCycles(c.data ?? []);
    setWellness(w.data ?? []);
  }
  useEffect(() => { load(); }, [range]);

  const stats = useMemo(() => summarizeCycles(cycles), [cycles]);
  const starts = useMemo(() => periodStarts(cycles), [cycles]);

  // Calendar (month view) — based on selected range, draw current visible month
  const calendar = useMemo(() => buildCalendarCells(cycles, wellness, starts), [cycles, wellness, starts]);
  const avgCycleLen = stats.avgCycle && stats.avgCycle > 0 ? stats.avgCycle : 28;
  const fertileMap = useMemo(() => buildFertileMap(starts, avgCycleLen), [starts, avgCycleLen]);

  async function exportPdf() {
    const wAvgs = wellnessAverages(wellness);
    const symptomTrends = topSymptomTrends(cycles, wellness);
    const { data: u } = await supabase.auth.getUser();
    const blob = buildHealthPdf({
      generatedFor: u.user?.email ?? "you",
      cycleSummary: stats,
      cycleHistory: cycles.filter((c) => c.flow_intensity || c.is_period_start).slice(-20).reverse().map((c) => ({
        date: c.entry_date, end: c.end_date, flow: c.flow_intensity,
        pain: c.pain_level,
        symptoms: c.period_symptoms ? Object.keys(c.period_symptoms).join(", ") : (c.symptoms ?? []).join(", "),
      })),
      insights: [],
      doctorQuestions: [],
      symptomTrends,
      wellnessAverages: wAvgs,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `herspace-cycle-report-${new Date().toISOString().slice(0, 10)}.pdf`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
          <TabsList>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="6mo">6 months</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={exportPdf} variant="outline" className="gap-2 rounded-full"><FileDown className="h-4 w-4" /> Download PDF report</Button>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <Stat label="Cycles" value={String(stats.cycleCount)} />
        <Stat label="Avg cycle" value={stats.avgCycle ? `${stats.avgCycle}d` : "—"} />
        <Stat label="Avg period" value={stats.avgPeriod ? `${stats.avgPeriod}d` : "—"} />
        <Stat label="Regularity" value={stats.regularity?.label ?? "—"} />
      </div>

      <Card>
        <CardHeader><CardTitle className="font-serif italic">Calendar</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1.5 text-xs">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-center text-muted-foreground">{d}</div>
            ))}
            {calendar.cells.map((c, i) => {
              const f = c.tooltip ? fertileMap.get(c.tooltip) : undefined;
              const isOv = f === "ovulation";
              const isFert = f === "fertile";
              const cls = c.period
                ? "bg-rose-200 text-rose-900 border-rose-300"
                : isOv
                ? "bg-emerald-200 text-emerald-900 border-emerald-400 ring-1 ring-emerald-400"
                : isFert
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : c.wellness
                ? "bg-sand/60 border-border"
                : "bg-background border-border/50 text-muted-foreground";
              const tip = [c.tooltip, c.period && "period", isOv && "est. ovulation", isFert && "fertile window", c.wellness && "wellness logged"].filter(Boolean).join(" • ");
              return (
                <div key={i} title={tip} className={`relative aspect-square rounded-md flex items-center justify-center text-[11px] border ${cls}`}>
                  {c.day || ""}
                  {isOv && <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-600" />}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] mt-3 text-muted-foreground">
            <Legend dot="bg-rose-300" label="Period" />
            <Legend dot="bg-emerald-100 border border-emerald-200" label="Fertile window" />
            <Legend dot="bg-emerald-500" label="Est. ovulation" />
            <Legend dot="bg-sand" label="Wellness logged" />
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <TrendChart title="Cycle length" series={cycleLengthSeries(starts)} unit="d" />
        <TrendChart title="Mood (energy 1–5)" series={energySeries(wellness)} unit="" />
        <TrendChart title="Sleep hours" series={sleepSeries(wellness)} unit="h" />
        <TrendChart title="Water (glasses)" series={waterSeries(wellness)} unit="" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-serif italic mt-1">{value}</p>
    </CardContent></Card>
  );
}
function Legend({ dot, label }: { dot: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`inline-block w-2.5 h-2.5 rounded-full ${dot}`} />{label}</span>;
}

function buildCalendarCells(cycles: any[], wellness: any[], starts: string[]) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const leading = first.getDay();
  const days = last.getDate();
  const periodDates = new Set<string>();
  for (const c of cycles) {
    if (c.flow_intensity || c.is_period_start) {
      const s = new Date(c.entry_date);
      const e = c.end_date ? new Date(c.end_date) : s;
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        periodDates.add(d.toISOString().slice(0, 10));
      }
    }
  }
  const ovulationDates = new Set<string>();
  // estimate: 14 days after each known period start
  for (const s of starts) {
    const d = new Date(s); d.setDate(d.getDate() + 14);
    ovulationDates.add(d.toISOString().slice(0, 10));
  }
  const wellnessDates = new Set(wellness.map((w) => w.log_date));
  const cells: { day: number | null; period: boolean; ovulation: boolean; wellness: boolean; tooltip: string }[] = [];
  for (let i = 0; i < leading; i++) cells.push({ day: null, period: false, ovulation: false, wellness: false, tooltip: "" });
  for (let d = 1; d <= days; d++) {
    const ds = new Date(now.getFullYear(), now.getMonth(), d).toISOString().slice(0, 10);
    cells.push({
      day: d,
      period: periodDates.has(ds),
      ovulation: ovulationDates.has(ds),
      wellness: wellnessDates.has(ds),
      tooltip: ds,
    });
  }
  return { cells };
}

function cycleLengthSeries(starts: string[]) {
  const sorted = [...starts].sort();
  const out: { label: string; value: number }[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const d = Math.round((new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86400000);
    if (d > 10 && d < 90) out.push({ label: sorted[i].slice(5), value: d });
  }
  return out;
}

function buildFertileMap(starts: string[], avgCycleLen: number): Map<string, "fertile" | "ovulation"> {
  const map = new Map<string, "fertile" | "ovulation">();
  const cycleLen = Math.max(20, Math.min(45, Math.round(avgCycleLen)));
  const today = new Date();
  const horizon = new Date(today); horizon.setMonth(horizon.getMonth() + 2);
  const sorted = [...starts].sort();
  const anchors: Date[] = sorted.map((s) => new Date(s));
  // project forward from last known start to cover current/next month
  if (anchors.length) {
    let last = new Date(anchors[anchors.length - 1]);
    while (last < horizon) {
      const next = new Date(last); next.setDate(next.getDate() + cycleLen);
      anchors.push(next);
      last = next;
    }
  }
  for (const a of anchors) {
    const ov = new Date(a); ov.setDate(ov.getDate() + (cycleLen - 14));
    // fertile window: ovulation -5 .. +1
    for (let off = -5; off <= 1; off++) {
      const d = new Date(ov); d.setDate(d.getDate() + off);
      const key = d.toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, "fertile");
    }
    map.set(ov.toISOString().slice(0, 10), "ovulation");
  }
  return map;
}
function energySeries(w: any[]) {
  return w.filter((x) => x.energy_level).map((x) => ({ label: x.log_date.slice(5), value: x.energy_level }));
}
function sleepSeries(w: any[]) {
  return w.filter((x) => x.sleep_hours).map((x) => ({ label: x.log_date.slice(5), value: x.sleep_hours }));
}
function waterSeries(w: any[]) {
  return w.filter((x) => x.water_glasses != null).map((x) => ({ label: x.log_date.slice(5), value: x.water_glasses }));
}

function TrendChart({ title, series, unit }: { title: string; series: { label: string; value: number }[]; unit: string }) {
  if (!series.length) return (
    <Card><CardHeader><CardTitle className="font-serif italic text-lg">{title}</CardTitle></CardHeader>
      <CardContent><p className="text-sm text-muted-foreground">Not enough data yet.</p></CardContent>
    </Card>
  );
  const w = 320, h = 120, pad = 16;
  const max = Math.max(...series.map((s) => s.value)) || 1;
  const min = Math.min(...series.map((s) => s.value)) || 0;
  const xs = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, series.length - 1);
  const ys = (v: number) => h - pad - ((v - min) / Math.max(1, max - min)) * (h - pad * 2);
  const d = series.map((s, i) => `${i === 0 ? "M" : "L"} ${xs(i)} ${ys(s.value)}`).join(" ");
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="font-serif italic text-lg">{title}</CardTitle></CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32">
          <path d={d} fill="none" stroke="hsl(var(--earth))" strokeWidth="2" />
          {series.map((s, i) => <circle key={i} cx={xs(i)} cy={ys(s.value)} r={2.5} fill="hsl(var(--earth))" />)}
        </svg>
        <p className="text-[11px] text-muted-foreground">Range: {min}{unit} — {max}{unit}</p>
      </CardContent>
    </Card>
  );
}

function wellnessAverages(w: any[]) {
  const sleeps = w.map((x) => x.sleep_hours).filter((v): v is number => typeof v === "number");
  const waters = w.map((x) => x.water_glasses).filter((v): v is number => typeof v === "number");
  const energies = w.map((x) => x.energy_level).filter((v): v is number => typeof v === "number");
  const moodCount: Record<string, number> = {};
  for (const x of w) for (const m of (x.mood ?? [])) moodCount[m] = (moodCount[m] ?? 0) + 1;
  const topMoods = Object.entries(moodCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m]) => m);
  return {
    sleepHours: sleeps.length ? +(sleeps.reduce((a, b) => a + b, 0) / sleeps.length).toFixed(1) : null,
    waterGlasses: waters.length ? Math.round(waters.reduce((a, b) => a + b, 0) / waters.length) : null,
    energyAvg: energies.length ? +(energies.reduce((a, b) => a + b, 0) / energies.length).toFixed(1) : null,
    topMoods,
  };
}

function topSymptomTrends(cycles: any[], wellness: any[]) {
  const map: Record<string, { sum: number; count: number; days: number }> = {};
  let totalDays = 0;
  for (const c of cycles) {
    totalDays++;
    const sev = (c.symptom_severities ?? {}) as Record<string, number>;
    for (const [k, v] of Object.entries(sev)) {
      map[k] = map[k] ?? { sum: 0, count: 0, days: 0 };
      map[k].sum += v; map[k].count += 1; map[k].days += 1;
    }
  }
  for (const w of wellness) {
    totalDays++;
    const sev = (w.symptoms ?? {}) as Record<string, number>;
    for (const [k, v] of Object.entries(sev)) {
      map[k] = map[k] ?? { sum: 0, count: 0, days: 0 };
      map[k].sum += v; map[k].count += 1; map[k].days += 1;
    }
  }
  return Object.entries(map)
    .map(([symptom, { sum, count, days }]) => ({
      symptom,
      avgSeverity: count ? sum / count : 0,
      freqPct: totalDays ? (days / totalDays) * 100 : 0,
    }))
    .sort((a, b) => b.freqPct - a.freqPct);
}