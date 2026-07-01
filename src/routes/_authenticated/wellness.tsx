import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeJournal } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { LifeBuoy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/wellness")({
  head: () => ({ meta: [{ title: "Mental Wellness · HerSpace" }] }),
  component: Wellness,
});

type Entry = { id: string; content: string; mood: string | null; ai_insight: string | null; created_at: string };
type JournalResult = Awaited<ReturnType<typeof analyzeJournal>>;

function Wellness() {
  const analyze = useServerFn(analyzeJournal);
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("");
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<JournalResult | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);

  async function load() {
    const { data } = await supabase.from("journal_entries").select("*").order("created_at", { ascending: false }).limit(20);
    setEntries((data as Entry[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    if (content.trim().length < 10) { toast.error("Write at least a sentence or two."); return; }
    setLoading(true); setInsight(null);
    try {
      const r = await analyze({ data: { content, mood: mood || undefined } });
      setInsight(r);
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        await supabase.from("journal_entries").insert({
          user_id: u.user.id, content, mood: mood || null, ai_insight: r.reflection,
        });
        load();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not analyze right now.");
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-earth mb-2">09 · Inner life</p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif italic">Mental Wellness</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">Write to think. The AI listens, never judges, and surfaces gentle insights. Entries are private to you.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="font-serif italic text-2xl">Tonight's entry</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Mood (optional)</Label><Input value={mood} onChange={(e) => setMood(e.target.value)} placeholder="anxious, hopeful, flat…" maxLength={40} /></div>
            <div><Label>Write freely</Label><Textarea rows={10} value={content} onChange={(e) => setContent(e.target.value)} placeholder="What's been on your mind today?" maxLength={8000} /></div>
            <Button onClick={submit} disabled={loading} className="w-full rounded-full bg-earth text-earth-foreground hover:brightness-110">
              {loading ? "Reflecting…" : "Save & reflect"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {insight && (
            <>
              {insight.escalation.suggested && (
                <Alert variant="destructive">
                  <LifeBuoy className="h-4 w-4" />
                  <AlertTitle>Please consider reaching out</AlertTitle>
                  <AlertDescription>{insight.escalation.reason ?? "What you wrote suggests you could use professional support."} If you're in crisis, contact a local helpline or trusted person immediately.</AlertDescription>
                </Alert>
              )}
              <Card>
                <CardHeader><CardTitle className="font-serif italic">A gentle mirror</CardTitle></CardHeader>
                <CardContent className="space-y-4 text-sm leading-relaxed">
                  <p>{insight.reflection}</p>
                  <div className="flex flex-wrap gap-2">
                    {insight.emotionalThemes.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
                  </div>
                  <p className="font-serif italic text-lg border-l-2 border-earth pl-4">{insight.gentlePrompt}</p>
                  <ul className="list-disc pl-5 space-y-1">{insight.copingSuggestions.map((c) => <li key={c}>{c}</li>)}</ul>
                </CardContent>
              </Card>
            </>
          )}

          <Card>
            <CardHeader><CardTitle className="font-serif italic">Recent entries</CardTitle></CardHeader>
            <CardContent className="space-y-3 max-h-[400px] overflow-auto">
              {entries.length === 0 && <p className="text-sm text-muted-foreground">Your journal is empty.</p>}
              {entries.map((e) => (
                <div key={e.id} className="rounded-xl border border-border p-3 text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</span>
                    {e.mood && <Badge variant="outline">{e.mood}</Badge>}
                  </div>
                  <p className="line-clamp-3 text-foreground/90">{e.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}