import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { predictCycle } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, AlertCircle } from "lucide-react";
import { periodStarts, summarizeCycles } from "@/lib/cycle-stats";

type PredictResult = Awaited<ReturnType<typeof predictCycle>>;

export function CyclePrediction() {
  const predict = useServerFn(predictCycle);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResult | null>(null);

  async function run() {
    setLoading(true);
    try {
      const { data } = await supabase.from("cycle_entries").select("*").order("entry_date", { ascending: false }).limit(120);
      const rows = data ?? [];
      const starts = periodStarts(rows);
      if (!starts.length) { toast.error("Log at least one period first."); setLoading(false); return; }
      const stats = summarizeCycles(rows);
      const r = await predict({
        data: {
          recentStarts: starts.slice(0, 12),
          avgCycleLength: stats.avgCycle,
          avgPeriodLength: stats.avgPeriod,
          regularityLabel: stats.regularity?.label ?? null,
          today: new Date().toISOString().slice(0, 10),
        },
      });
      setResult(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not predict right now.");
    } finally { setLoading(false); }
  }

  return (
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