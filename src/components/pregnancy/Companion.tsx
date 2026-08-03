import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { pregnancyCompanion } from "@/lib/ai.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { MEDICAL_DISCLAIMER, gestationalAge, trimesterOf } from "@/lib/pregnancy";
import type { PregnancyProfile } from "@/hooks/use-pregnancy-profile";

type Result = Awaited<ReturnType<typeof pregnancyCompanion>>;

const SUGGESTED = [
  "Is back pain normal?",
  "Can I eat pineapple?",
  "Can I travel this week?",
  "What foods are rich in iron?",
  "When should I feel baby kicks?",
];

export function Companion({ profile }: { profile: PregnancyProfile }) {
  const ask = useServerFn(pregnancyCompanion);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const week = profile.lmp_date ? Math.min(42, Math.max(1, gestationalAge(profile.lmp_date).weeks)) : 1;

  async function run(q?: string) {
    setLoading(true);
    try {
      const r = await ask({
        data: {
          week,
          trimester: trimesterOf(Math.min(40, week)),
          dueDate: profile.due_date ?? undefined,
          question: (q ?? question).trim() || undefined,
        },
      });
      setResult(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reach the companion right now.");
    } finally { setLoading(false); }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif italic text-2xl flex items-center gap-2"><Sparkles className="h-5 w-5" /> AI pregnancy companion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask anything about this week…" maxLength={500}
            onKeyDown={(e) => { if (e.key === "Enter") run(); }} />
          <Button className="rounded-full" onClick={() => run()} disabled={loading}>{loading ? "Thinking…" : "Ask"}</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.map((s) => (
            <Badge key={s} variant="outline" className="cursor-pointer" onClick={() => { setQuestion(s); run(s); }}>{s}</Badge>
          ))}
        </div>

        {result && (
          <div className="space-y-3 text-sm leading-relaxed">
            <p className="font-serif italic text-lg">{result.greeting}</p>
            {result.answer && <p className="rounded-2xl border border-border p-4">{result.answer}</p>}
            <div className="grid md:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Your baby</p><p className="mt-2">{result.babyUpdate}</p></div>
              <div className="rounded-2xl border border-border p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Your body</p><p className="mt-2">{result.bodyUpdate}</p></div>
            </div>
            <p className="border-l-2 border-primary pl-4 font-serif italic text-base">{result.todaysTip}</p>
            {result.nutritionFocus.length > 0 && (
              <div><p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Nutrition focus</p>
                <ul className="list-disc pl-5 space-y-1">{result.nutritionFocus.map((n) => <li key={n}>{n}</li>)}</ul></div>
            )}
            {result.watchFor.length > 0 && (
              <div><p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Watch for</p>
                <ul className="list-disc pl-5 space-y-1">{result.watchFor.map((n) => <li key={n}>{n}</li>)}</ul></div>
            )}
            {result.askYourClinician.length > 0 && (
              <div><p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Ask your clinician</p>
                <ul className="list-disc pl-5 space-y-1">{result.askYourClinician.map((n) => <li key={n}>{n}</li>)}</ul></div>
            )}
            <p className="text-xs text-muted-foreground">{result.disclaimer || MEDICAL_DISCLAIMER}</p>
          </div>
        )}
        {!result && <p className="text-xs text-muted-foreground">{MEDICAL_DISCLAIMER}</p>}
      </CardContent>
    </Card>
  );
}