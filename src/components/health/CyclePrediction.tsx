import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { predictCycle } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, AlertCircle, History, Trash2, ChevronDown, CalendarDays, Droplets, Activity, Flower2, Moon, Gauge, GitCompare, X, ArrowRight, FileDown } from "lucide-react";
import { periodStarts, summarizeCycles } from "@/lib/cycle-stats";
import { buildPredictionRunPdf } from "@/lib/prediction-pdf";

type PredictResult = Awaited<ReturnType<typeof predictCycle>>;

type PredictionRun = {
  id: string;
  predicted_at: string;
  next_period_low: string | null;
  next_period_high: string | null;
  next_period_end: string | null;
  fertile_window_low: string | null;
  fertile_window_high: string | null;
  ovulation_day: string | null;
  pms_start: string | null;
  confidence: number | null;
  is_late: boolean | null;
  summary: string | null;
  cycles_used: number;
  data_start: string | null;
  data_end: string | null;
  recent_starts: string[];
  avg_cycle_length: number | null;
  avg_period_length: number | null;
  regularity_label: string | null;
};

export function CyclePrediction() {
  const predict = useServerFn(predictCycle);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [history, setHistory] = useState<PredictionRun[]>([]);
  const [showAll, setShowAll] = useState(false);

  async function loadHistory() {
    const { data } = await supabase
      .from("prediction_runs")
      .select("*")
      .order("predicted_at", { ascending: false })
      .limit(50);
    setHistory((data ?? []) as unknown as PredictionRun[]);
  }

  useEffect(() => { loadHistory(); }, []);

  async function run() {
    setLoading(true);
    try {
      const { data } = await supabase.from("cycle_entries").select("*").order("entry_date", { ascending: false }).limit(120);
      const rows = data ?? [];
      const starts = periodStarts(rows);
      if (!starts.length) { toast.error("Log at least one period first."); setLoading(false); return; }
      const stats = summarizeCycles(rows);
      const usedStarts = starts.slice(0, 12);
      const r = await predict({
        data: {
          recentStarts: usedStarts,
          avgCycleLength: stats.avgCycle,
          avgPeriodLength: stats.avgPeriod,
          regularityLabel: stats.regularity?.label ?? null,
          today: new Date().toISOString().slice(0, 10),
        },
      });
      setResult(r);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (uid) {
        const dataDates = usedStarts.slice().sort();
        await supabase.from("prediction_runs").insert({
          user_id: uid,
          next_period_low: r.nextPeriodLow,
          next_period_high: r.nextPeriodHigh,
          next_period_end: r.nextPeriodEnd,
          fertile_window_low: r.fertileWindowLow,
          fertile_window_high: r.fertileWindowHigh,
          ovulation_day: r.ovulationDay,
          pms_start: r.pmsStart,
          confidence: r.confidence,
          is_late: r.isLate,
          summary: r.summary,
          cycles_used: usedStarts.length,
          data_start: dataDates[0] ?? null,
          data_end: dataDates[dataDates.length - 1] ?? null,
          recent_starts: usedStarts,
          avg_cycle_length: stats.avgCycle,
          avg_period_length: stats.avgPeriod,
          regularity_label: stats.regularity?.label ?? null,
        });
        loadHistory();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not predict right now.");
    } finally { setLoading(false); }
  }

  async function deleteRun(id: string) {
    const { error } = await supabase.from("prediction_runs").delete().eq("id", id);
    if (error) { toast.error("Couldn't remove that entry."); return; }
    setHistory((h) => h.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-4">
    <Card className="overflow-hidden border-earth/20 bg-gradient-to-br from-background to-earth/[0.03]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="font-serif italic text-2xl">AI cycle prediction</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Personalized estimates from your logged history</p>
        </div>
        <Button onClick={run} disabled={loading} size="sm" className="rounded-full bg-earth text-earth-foreground hover:brightness-110 gap-2">
          <Sparkles className="h-3.5 w-3.5" /> {loading ? "Predicting…" : result ? "Refresh" : "Predict"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result && !loading && (
          <p className="text-sm text-muted-foreground">Click <em>Predict</em> to estimate your next period, fertile window, ovulation day, and PMS phase.</p>
        )}
        {result && (
          <>
            <p className="text-base leading-relaxed">{result.summary}</p>
            {result.isLate && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 p-3 flex gap-2 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                Your period is past the expected window. Track for a few more days; if it's longer than 7 days late, consider checking in with a clinician.
              </div>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              <Row icon={<Droplets className="h-3 w-3" />} tone="rose" label="Next period" value={`${fmtDate(result.nextPeriodLow)} → ${fmtDate(result.nextPeriodHigh)}`} />
              <Row icon={<CalendarDays className="h-3 w-3" />} tone="rose" label="Expected end" value={fmtDate(result.nextPeriodEnd)} />
              <Row icon={<Flower2 className="h-3 w-3" />} tone="emerald" label="Fertile window" value={`${fmtDate(result.fertileWindowLow)} → ${fmtDate(result.fertileWindowHigh)}`} />
              <Row icon={<Activity className="h-3 w-3" />} tone="emerald" label="Ovulation day" value={fmtDate(result.ovulationDay)} />
              <Row icon={<Moon className="h-3 w-3" />} tone="violet" label="PMS phase starts" value={fmtDate(result.pmsStart)} />
              <Row icon={<Gauge className="h-3 w-3" />} tone="earth" label="Confidence" value={`${Math.round(result.confidence)}%`} />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline">Improves with more cycles logged</Badge>
              <Badge variant="outline">Educational estimate · not a diagnosis</Badge>
            </div>
          </>
        )}
      </CardContent>
    </Card>
    <PredictionTimeline history={history} showAll={showAll} setShowAll={setShowAll} onDelete={deleteRun} />
    </div>
  );
}

const TONE: Record<string, string> = {
  rose: "border-rose-200/70 bg-rose-50/40 text-rose-700",
  emerald: "border-emerald-200/70 bg-emerald-50/40 text-emerald-700",
  violet: "border-violet-200/70 bg-violet-50/40 text-violet-700",
  earth: "border-earth/30 bg-earth/5 text-earth",
};
function Row({ label, value, icon, tone = "earth" }: { label: string; value: string; icon?: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-lg border border-border p-3 hover:border-earth/40 transition-colors">
      <div className="flex items-center gap-1.5">
        {icon && <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${TONE[tone] ?? TONE.earth}`}>{icon}</span>}
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="font-medium mt-1.5 text-foreground">{value}</p>
    </div>
  );
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function monthsCovered(start: string | null, end: string | null) {
  if (!start || !end) return "—";
  const s = new Date(start), e = new Date(end);
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  return `${fmt(s)} → ${fmt(e)} · ${months} mo`;
}
function diffPrev<T>(curr: T | null, prev: T | null | undefined): boolean {
  if (prev === undefined) return false;
  return String(curr ?? "") !== String(prev ?? "");
}

function PredictionTimeline({
  history,
  showAll,
  setShowAll,
  onDelete,
}: {
  history: PredictionRun[];
  showAll: boolean;
  setShowAll: (b: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const visible = showAll ? history : history.slice(0, 5);
  const [openId, setOpenId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }
  const [aId, bId] = compareIds;
  const a = history.find((r) => r.id === aId) ?? null;
  const b = history.find((r) => r.id === bId) ?? null;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="font-serif italic text-2xl flex items-center gap-2">
          <History className="h-5 w-5" /> Prediction history
        </CardTitle>
        <div className="flex items-center gap-2">
          {compareIds.length > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              {compareIds.length}/2 selected
              <button onClick={() => { setCompareIds([]); setCompareOpen(false); }} aria-label="Clear selection"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          <Button
            variant={compareIds.length === 2 ? "default" : "outline"}
            size="sm"
            disabled={compareIds.length !== 2}
            onClick={() => setCompareOpen(true)}
            className="rounded-full gap-1.5"
          >
            <GitCompare className="h-3.5 w-3.5" /> Compare
          </Button>
          {history.length > 5 && (
            <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)} className="rounded-full">
              {showAll ? "Show recent" : `Show all (${history.length})`}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No predictions yet. Run one above and a timeline will appear here showing when each forecast was recalculated and which months of data fed it.</p>
        ) : (
          <>
          {compareIds.length > 0 && !compareOpen && (
            <p className="text-xs text-muted-foreground mb-3">Select {compareIds.length === 1 ? "one more run" : "two runs"} and tap <strong>Compare</strong> to see what changed.</p>
          )}
          <ol className="relative border-l border-border ml-2 space-y-5">
            {visible.map((run, i) => {
              const prev = history[i + 1];
              const nextChanged = diffPrev(run.next_period_low, prev?.next_period_low) || diffPrev(run.next_period_high, prev?.next_period_high);
              const fertileChanged = diffPrev(run.fertile_window_low, prev?.fertile_window_low) || diffPrev(run.fertile_window_high, prev?.fertile_window_high);
              const ovChanged = diffPrev(run.ovulation_day, prev?.ovulation_day);
              const newStarts = prev
                ? run.recent_starts.filter((d) => !prev.recent_starts.includes(d))
                : run.recent_starts.slice(0, 3);
              const selected = compareIds.includes(run.id);
              return (
                <li key={run.id} className={`ml-4 rounded-lg transition-colors ${selected ? "bg-earth/5 ring-1 ring-earth/30 p-2 -ml-2 pl-4" : ""}`}>
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-earth border-2 border-background" />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleCompare(run.id)}
                          className="h-3.5 w-3.5 rounded border-border accent-[oklch(var(--earth))]"
                          aria-label="Select for compare"
                        />
                        <p className="text-sm font-medium">{fmtDateTime(run.predicted_at)}</p>
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{Math.round(run.confidence ?? 0)}% confidence</Badge>
                      <button
                        onClick={() => exportRunPdf(run)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Download PDF report"
                        title="Download PDF report"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => onDelete(run.id)} className="text-muted-foreground hover:text-foreground" aria-label="Remove entry">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid sm:grid-cols-2 gap-2 text-sm">
                    <div className={`rounded-md border p-2 ${nextChanged ? "border-earth/60 bg-earth/5" : "border-border"}`}>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Next period</p>
                      <p className="font-medium">{fmtDate(run.next_period_low)} → {fmtDate(run.next_period_high)}</p>
                    </div>
                    <div className={`rounded-md border p-2 ${fertileChanged ? "border-earth/60 bg-earth/5" : "border-border"}`}>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Fertile window</p>
                      <p className="font-medium">{fmtDate(run.fertile_window_low)} → {fmtDate(run.fertile_window_high)}</p>
                    </div>
                    <div className={`rounded-md border p-2 ${ovChanged ? "border-earth/60 bg-earth/5" : "border-border"}`}>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Ovulation</p>
                      <p className="font-medium">{fmtDate(run.ovulation_day)}</p>
                    </div>
                    <div className="rounded-md border border-border p-2">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Data window</p>
                      <p className="font-medium">{monthsCovered(run.data_start, run.data_end)}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Used {run.cycles_used} period start{run.cycles_used === 1 ? "" : "s"}</span>
                    {run.avg_cycle_length && <><span>·</span><span>avg {Math.round(Number(run.avg_cycle_length))}d cycle</span></>}
                    {run.regularity_label && <><span>·</span><span>{run.regularity_label}</span></>}
                    {prev && newStarts.length > 0 && (
                      <>
                        <span>·</span>
                        <span>triggered by new entries:</span>
                        {newStarts.slice(0, 4).map((d) => (
                          <Badge key={d} variant="secondary" className="text-[10px] font-normal">{fmtDate(d)}</Badge>
                        ))}
                        {newStarts.length > 4 && <span>+{newStarts.length - 4}</span>}
                      </>
                    )}
                    {!prev && (
                      <><span>·</span><span>first prediction</span></>
                    )}
                  </div>
                  <button
                    onClick={() => setOpenId(openId === run.id ? null : run.id)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-earth hover:underline"
                    aria-expanded={openId === run.id}
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openId === run.id ? "rotate-180" : ""}`} />
                    {openId === run.id ? "Hide details" : "View calculation details"}
                  </button>
                  {openId === run.id && <RunDetails run={run} />}
                </li>
              );
            })}
          </ol>
          </>
        )}
      </CardContent>
      {compareOpen && a && b && (
        <CompareDialog a={a} b={b} onClose={() => setCompareOpen(false)} />
      )}
    </Card>
  );
}

function RunDetails({ run }: { run: PredictionRun }) {
  return <RunDetailsInner run={run} />;
}

async function exportRunPdf(run: PredictionRun) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const name = (auth.user?.user_metadata as any)?.full_name || auth.user?.email || "you";
    const blob = buildPredictionRunPdf(run as any, name);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date(run.predicted_at).toISOString().slice(0, 10);
    a.download = `herspace-prediction-${stamp}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("PDF report downloaded.");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Couldn't generate the PDF.");
  }
}

function RunDetailsInner({ run }: { run: PredictionRun }) {
  const starts = [...(run.recent_starts ?? [])].sort();
  // group starts by month
  const groups = new Map<string, string[]>();
  for (const d of starts) {
    const key = new Date(d).toLocaleDateString(undefined, { month: "long", year: "numeric" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }
  // gaps between consecutive starts
  const gaps: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const a = new Date(starts[i - 1]).getTime();
    const b = new Date(starts[i]).getTime();
    gaps.push(Math.round((b - a) / 86400000));
  }
  const fwLow = run.fertile_window_low ? new Date(run.fertile_window_low) : null;
  const fwHigh = run.fertile_window_high ? new Date(run.fertile_window_high) : null;
  const ov = run.ovulation_day ? new Date(run.ovulation_day) : null;
  const fwLen = fwLow && fwHigh ? Math.round((fwHigh.getTime() - fwLow.getTime()) / 86400000) + 1 : null;
  const ovOffset = ov && fwLow && fwHigh ? Math.round((ov.getTime() - fwLow.getTime()) / 86400000) : null;
  const periodToOv = ov && run.next_period_low
    ? Math.round((new Date(run.next_period_low).getTime() - ov.getTime()) / 86400000)
    : null;
  const pmsLead = run.pms_start && run.next_period_low
    ? Math.round((new Date(run.next_period_low).getTime() - new Date(run.pms_start).getTime()) / 86400000)
    : null;

  return (
    <div className="mt-3 rounded-lg border border-earth/20 bg-muted/30 p-3 space-y-3 text-xs">
      <section>
        <p className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground mb-1.5">Months used in this calculation</p>
        {groups.size === 0 ? (
          <p className="text-muted-foreground">No period starts recorded.</p>
        ) : (
          <div className="space-y-1.5">
            {Array.from(groups.entries()).map(([month, dates]) => (
              <div key={month} className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium min-w-[110px] text-foreground">{month}</span>
                {dates.map((d) => (
                  <Badge key={d} variant="outline" className="text-[10px] font-normal bg-background">{new Date(d).getDate()}</Badge>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground mb-1.5">Average cycle calculations</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <Stat label="Avg cycle length" value={run.avg_cycle_length ? `${Math.round(Number(run.avg_cycle_length))} days` : "—"} />
          <Stat label="Avg period length" value={run.avg_period_length ? `${Math.round(Number(run.avg_period_length))} days` : "—"} />
          <Stat label="Cycles measured" value={`${Math.max(starts.length - 1, 0)} gap${starts.length - 1 === 1 ? "" : "s"}`} />
          <Stat label="Regularity" value={run.regularity_label ?? "—"} />
          {gaps.length > 0 && (
            <Stat
              label="Gap range"
              value={`${Math.min(...gaps)}–${Math.max(...gaps)} days`}
              hint={gaps.slice(-6).join(" · ") + " d"}
            />
          )}
        </div>
      </section>

      <section>
        <p className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground mb-1.5">Fertility-window parameters</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <Stat label="Window" value={`${fmtDate(run.fertile_window_low)} → ${fmtDate(run.fertile_window_high)}`} />
          <Stat label="Window length" value={fwLen ? `${fwLen} days` : "—"} />
          <Stat label="Ovulation day" value={fmtDate(run.ovulation_day)} />
          <Stat label="Ovulation offset" value={ovOffset !== null ? `Day ${ovOffset + 1} of window` : "—"} />
          <Stat label="Ovulation → next period" value={periodToOv !== null ? `${periodToOv} days (luteal)` : "—"} />
          <Stat label="PMS lead time" value={pmsLead !== null ? `${pmsLead} days before period` : "—"} />
        </div>
      </section>

      {run.summary && (
        <section>
          <p className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground mb-1">Model summary</p>
          <p className="text-foreground/80 leading-relaxed">{run.summary}</p>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground mt-0.5">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">{hint}</p>}
    </div>
  );
}

function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}
function deltaDays(a: string | null, b: string | null): string {
  const d = daysBetween(a, b);
  if (d === null) return "—";
  if (d === 0) return "no change";
  return d > 0 ? `+${d}d later` : `${d}d earlier`;
}

function CompareDialog({ a, b, onClose }: { a: PredictionRun; b: PredictionRun; onClose: () => void }) {
  // Order chronologically: older = left, newer = right
  const [older, newer] = new Date(a.predicted_at).getTime() <= new Date(b.predicted_at).getTime() ? [a, b] : [b, a];

  const setOld = new Set(older.recent_starts ?? []);
  const setNew = new Set(newer.recent_starts ?? []);
  const added = (newer.recent_starts ?? []).filter((d) => !setOld.has(d)).sort();
  const removed = (older.recent_starts ?? []).filter((d) => !setNew.has(d)).sort();
  const shared = (newer.recent_starts ?? []).filter((d) => setOld.has(d)).sort();

  const fwLenOld = older.fertile_window_low && older.fertile_window_high
    ? (daysBetween(older.fertile_window_low, older.fertile_window_high) ?? 0) + 1 : null;
  const fwLenNew = newer.fertile_window_low && newer.fertile_window_high
    ? (daysBetween(newer.fertile_window_low, newer.fertile_window_high) ?? 0) + 1 : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-4xl max-h-[88vh] overflow-y-auto rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/95 backdrop-blur px-5 py-3">
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-earth" />
            <h3 className="font-serif italic text-xl">Compare predictions</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-5 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <RunHeaderCard label="Earlier run" run={older} />
            <RunHeaderCard label="Later run" run={newer} highlight />
          </div>

          <Section title="Months & period starts used">
            <div className="grid grid-cols-2 gap-3">
              <MonthsList starts={older.recent_starts ?? []} removed={removed} />
              <MonthsList starts={newer.recent_starts ?? []} added={added} />
            </div>
            <div className="mt-3 grid sm:grid-cols-3 gap-2">
              <Stat label="Added entries" value={added.length ? `+${added.length}` : "0"} hint={added.slice(0, 4).map(fmtDate).join(", ") || undefined} />
              <Stat label="Removed entries" value={removed.length ? `−${removed.length}` : "0"} hint={removed.slice(0, 4).map(fmtDate).join(", ") || undefined} />
              <Stat label="Shared entries" value={`${shared.length}`} />
            </div>
          </Section>

          <Section title="Average cycle calculations">
            <DiffTable rows={[
              ["Avg cycle length", numFmt(older.avg_cycle_length, "d"), numFmt(newer.avg_cycle_length, "d"), numDelta(older.avg_cycle_length, newer.avg_cycle_length, "d")],
              ["Avg period length", numFmt(older.avg_period_length, "d"), numFmt(newer.avg_period_length, "d"), numDelta(older.avg_period_length, newer.avg_period_length, "d")],
              ["Cycles used", `${older.cycles_used}`, `${newer.cycles_used}`, intDelta(older.cycles_used, newer.cycles_used)],
              ["Regularity", older.regularity_label ?? "—", newer.regularity_label ?? "—", older.regularity_label === newer.regularity_label ? "no change" : "changed"],
              ["Confidence", `${Math.round(older.confidence ?? 0)}%`, `${Math.round(newer.confidence ?? 0)}%`, pctDelta(older.confidence, newer.confidence)],
            ]} />
          </Section>

          <Section title="Fertility-window parameters">
            <DiffTable rows={[
              ["Next period (start)", fmtDate(older.next_period_low), fmtDate(newer.next_period_low), deltaDays(older.next_period_low, newer.next_period_low)],
              ["Next period (end of window)", fmtDate(older.next_period_high), fmtDate(newer.next_period_high), deltaDays(older.next_period_high, newer.next_period_high)],
              ["Expected period end", fmtDate(older.next_period_end), fmtDate(newer.next_period_end), deltaDays(older.next_period_end, newer.next_period_end)],
              ["Fertile window start", fmtDate(older.fertile_window_low), fmtDate(newer.fertile_window_low), deltaDays(older.fertile_window_low, newer.fertile_window_low)],
              ["Fertile window end", fmtDate(older.fertile_window_high), fmtDate(newer.fertile_window_high), deltaDays(older.fertile_window_high, newer.fertile_window_high)],
              ["Window length", fwLenOld ? `${fwLenOld}d` : "—", fwLenNew ? `${fwLenNew}d` : "—", intDelta(fwLenOld, fwLenNew, "d")],
              ["Ovulation day", fmtDate(older.ovulation_day), fmtDate(newer.ovulation_day), deltaDays(older.ovulation_day, newer.ovulation_day)],
              ["PMS phase starts", fmtDate(older.pms_start), fmtDate(newer.pms_start), deltaDays(older.pms_start, newer.pms_start)],
            ]} />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</h4>
      {children}
    </section>
  );
}

function RunHeaderCard({ label, run, highlight }: { label: string; run: PredictionRun; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-earth/40 bg-earth/5" : "border-border bg-muted/30"}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-medium mt-1">{fmtDateTime(run.predicted_at)}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {run.cycles_used} starts · {monthsCovered(run.data_start, run.data_end)} · {Math.round(run.confidence ?? 0)}% confidence
      </p>
    </div>
  );
}

function MonthsList({ starts, added = [], removed = [] }: { starts: string[]; added?: string[]; removed?: string[] }) {
  const set = new Set(starts);
  const all = Array.from(new Set([...starts, ...removed])).sort();
  const groups = new Map<string, string[]>();
  for (const d of all) {
    const key = new Date(d).toLocaleDateString(undefined, { month: "short", year: "numeric" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }
  return (
    <div className="rounded-md border border-border bg-background p-2 space-y-1.5">
      {groups.size === 0 && <p className="text-xs text-muted-foreground">No data</p>}
      {Array.from(groups.entries()).map(([month, dates]) => (
        <div key={month} className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground min-w-[68px]">{month}</span>
          {dates.map((d) => {
            const isAdded = added.includes(d);
            const isRemoved = !set.has(d);
            return (
              <Badge
                key={d}
                variant="outline"
                className={`text-[10px] font-normal ${isAdded ? "border-emerald-400 bg-emerald-50 text-emerald-700" : isRemoved ? "border-rose-300 bg-rose-50 text-rose-700 line-through" : "bg-background"}`}
                title={fmtDate(d)}
              >
                {new Date(d).getDate()}
              </Badge>
            );
          })}
        </div>
      ))}
      <div className="flex gap-3 pt-1 text-[10px] text-muted-foreground">
        {added.length > 0 && <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> added</span>}
        {removed.length > 0 && <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-300" /> removed</span>}
      </div>
    </div>
  );
}

function DiffTable({ rows }: { rows: [string, string, string, string][] }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th className="text-left font-medium px-3 py-1.5">Parameter</th>
            <th className="text-left font-medium px-3 py-1.5">Earlier</th>
            <th className="text-left font-medium px-3 py-1.5"></th>
            <th className="text-left font-medium px-3 py-1.5">Later</th>
            <th className="text-left font-medium px-3 py-1.5">Δ change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, av, bv, delta], idx) => {
            const changed = av !== bv && delta !== "no change" && delta !== "—";
            return (
              <tr key={idx} className={`border-t border-border ${changed ? "bg-earth/5" : ""}`}>
                <td className="px-3 py-1.5 font-medium text-foreground/80">{label}</td>
                <td className="px-3 py-1.5 tabular-nums">{av}</td>
                <td className="px-1 py-1.5 text-muted-foreground"><ArrowRight className="h-3 w-3" /></td>
                <td className="px-3 py-1.5 tabular-nums font-medium">{bv}</td>
                <td className={`px-3 py-1.5 tabular-nums ${changed ? "text-earth font-medium" : "text-muted-foreground"}`}>{delta}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function numFmt(v: number | null, unit = ""): string {
  if (v == null) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 10) / 10}${unit}`;
}
function numDelta(a: number | null, b: number | null, unit = ""): string {
  if (a == null || b == null) return "—";
  const d = Math.round((Number(b) - Number(a)) * 10) / 10;
  if (d === 0) return "no change";
  return d > 0 ? `+${d}${unit}` : `${d}${unit}`;
}
function intDelta(a: number | null, b: number | null, unit = ""): string {
  if (a == null || b == null) return "—";
  const d = b - a;
  if (d === 0) return "no change";
  return d > 0 ? `+${d}${unit}` : `${d}${unit}`;
}
function pctDelta(a: number | null, b: number | null): string {
  if (a == null || b == null) return "—";
  const d = Math.round(b - a);
  if (d === 0) return "no change";
  return d > 0 ? `+${d} pts` : `${d} pts`;
}