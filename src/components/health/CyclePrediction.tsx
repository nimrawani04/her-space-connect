import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { predictCycle } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, AlertCircle, History, Trash2 } from "lucide-react";
import { periodStarts, summarizeCycles } from "@/lib/cycle-stats";

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="font-serif italic text-2xl">AI cycle prediction</CardTitle>
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
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <Row label="Next period" value={`${result.nextPeriodLow} → ${result.nextPeriodHigh}`} />
              <Row label="Expected end" value={result.nextPeriodEnd} />
              <Row label="Fertile window" value={`${result.fertileWindowLow} → ${result.fertileWindowHigh}`} />
              <Row label="Ovulation day" value={result.ovulationDay} />
              <Row label="PMS phase starts" value={result.pmsStart} />
              <Row label="Confidence" value={`${Math.round(result.confidence)}%`} />
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-medium mt-1">{value}</p>
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
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="font-serif italic text-2xl flex items-center gap-2">
          <History className="h-5 w-5" /> Prediction history
        </CardTitle>
        {history.length > 5 && (
          <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)} className="rounded-full">
            {showAll ? "Show recent" : `Show all (${history.length})`}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No predictions yet. Run one above and a timeline will appear here showing when each forecast was recalculated and which months of data fed it.</p>
        ) : (
          <ol className="relative border-l border-border ml-2 space-y-5">
            {visible.map((run, i) => {
              const prev = history[i + 1];
              const nextChanged = diffPrev(run.next_period_low, prev?.next_period_low) || diffPrev(run.next_period_high, prev?.next_period_high);
              const fertileChanged = diffPrev(run.fertile_window_low, prev?.fertile_window_low) || diffPrev(run.fertile_window_high, prev?.fertile_window_high);
              const ovChanged = diffPrev(run.ovulation_day, prev?.ovulation_day);
              const newStarts = prev
                ? run.recent_starts.filter((d) => !prev.recent_starts.includes(d))
                : run.recent_starts.slice(0, 3);
              return (
                <li key={run.id} className="ml-4">
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-earth border-2 border-background" />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">{fmtDateTime(run.predicted_at)}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{Math.round(run.confidence ?? 0)}% confidence</Badge>
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
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}