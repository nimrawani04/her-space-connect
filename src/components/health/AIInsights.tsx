import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateHealthInsights } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Sparkles, AlertTriangle } from "lucide-react";

type InsightResult = Awaited<ReturnType<typeof generateHealthInsights>>;

const CAT_TONE: Record<string, string> = {
  cycle: "bg-rose-100 text-rose-900",
  mood: "bg-violet-100 text-violet-900",
  energy: "bg-amber-100 text-amber-900",
  sleep: "bg-indigo-100 text-indigo-900",
  symptoms: "bg-emerald-100 text-emerald-900",
  lifestyle: "bg-sky-100 text-sky-900",
};

export function AIInsights() {
  const analyze = useServerFn(generateHealthInsights);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsightResult | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    try {
      const [cycles, wellness] = await Promise.all([
        supabase.from("cycle_entries").select("entry_date,end_date,flow_intensity,pain_level,symptoms,symptom_severities,mood,energy").order("entry_date", { ascending: false }).limit(90),
        supabase.from("wellness_logs").select("log_date,mood,energy_level,sleep_hours,sleep_quality,water_glasses,exercise,symptoms").order("log_date", { ascending: false }).limit(60),
      ]);
      if (!cycles.data?.length && !wellness.data?.length) {
        toast.error("Log a few entries first so the AI has patterns to read.");
        setLoading(false);
        return;
      }
      const r = await analyze({
        data: {
          cycleHistory: JSON.stringify(cycles.data ?? []).slice(0, 7500),
          wellnessHistory: JSON.stringify(wellness.data ?? []).slice(0, 7500),
        },
      });
      setResult(r);
      setAnalyzedAt(new Date().toLocaleString());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not analyze right now.");
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-earth">AI pattern detection</p>
            <p className="text-sm text-muted-foreground mt-1">Reads your last 90 days of cycle and wellness logs and surfaces plain-language patterns.</p>
          </div>
          <Button onClick={run} disabled={loading} className="rounded-full bg-earth text-earth-foreground hover:brightness-110 gap-2">
            <Sparkles className="h-4 w-4" /> {loading ? "Reading your history…" : result ? "Re-analyze" : "Find patterns"}
          </Button>
        </CardContent>
      </Card>

      {analyzedAt && <p className="text-xs text-muted-foreground -mt-3">Last analyzed: {analyzedAt}</p>}

      {result && (
        <>
          {result.watchOuts.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Worth raising with a clinician</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 mt-1 space-y-1">{result.watchOuts.map((w) => <li key={w}>{w}</li>)}</ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {result.insights.map((i, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2 space-y-0">
                  <CardTitle className="font-serif italic text-lg">{i.title}</CardTitle>
                  <Badge className={`capitalize ${CAT_TONE[i.category] ?? ""}`} variant="secondary">{i.category}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{i.detail}</p>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-2">Confidence: {i.confidence}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {result.doctorQuestions.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="font-serif italic">Questions for your clinician</CardTitle></CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-1.5 text-sm">{result.doctorQuestions.map((q) => <li key={q}>{q}</li>)}</ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}