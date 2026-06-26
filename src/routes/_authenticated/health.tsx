import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeSymptoms, simplifyResearch } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { AlertTriangle, FileDown, Printer, Sparkles, ShieldCheck, Stethoscope } from "lucide-react";

export const Route = createFileRoute("/_authenticated/health")({
  head: () => ({ meta: [{ title: "Health Hub · HerSpace" }] }),
  component: HealthHub,
});

type SymptomResult = Awaited<ReturnType<typeof analyzeSymptoms>>;
type ResearchResult = Awaited<ReturnType<typeof simplifyResearch>>;

function HealthHub() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <section className="rounded-3xl bg-sand/40 border border-border p-8 md:p-12">
        <p className="text-xs uppercase tracking-[0.2em] text-earth mb-3">01 · Intelligence</p>
        <h1 className="text-4xl md:text-5xl font-serif italic leading-tight max-w-2xl">
          Understand your body, before you see the doctor.
        </h1>
        <p className="text-muted-foreground mt-4 max-w-2xl leading-relaxed">
          The HerSpace AI Symptom Assistant listens carefully, suggests possibilities to discuss with a clinician,
          and prepares a doctor-ready report — designed by and for women.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-earth text-earth-foreground hover:brightness-110 gap-2">
            <a href="#symptom-assistant"><Sparkles className="h-4 w-4" /> Start with your symptoms</a>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <a href="#symptom-assistant">How it works</a>
          </Button>
        </div>
        <div className="mt-8 grid sm:grid-cols-3 gap-4 text-sm">
          {[
            { icon: Sparkles, title: "Plain-English answers", body: "No jargon. Just a calm summary you can act on." },
            { icon: Stethoscope, title: "Doctor-ready report", body: "Export a printable PDF to bring to your appointment." },
            { icon: ShieldCheck, title: "Private by design", body: "Your entries stay yours. Educational, never diagnostic." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl bg-background/60 border border-border p-4">
              <f.icon className="h-4 w-4 text-earth mb-2" />
              <p className="font-medium">{f.title}</p>
              <p className="text-muted-foreground mt-1 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <Tabs defaultValue="symptoms" className="space-y-6 scroll-mt-8" id="symptom-assistant">
        <TabsList className="bg-muted">
          <TabsTrigger value="symptoms">AI Symptom Assistant</TabsTrigger>
          <TabsTrigger value="research">Research Simplifier</TabsTrigger>
          <TabsTrigger value="tracker">Cycle Tracker</TabsTrigger>
        </TabsList>

        <TabsContent value="symptoms"><SymptomAssistant /></TabsContent>
        <TabsContent value="research"><ResearchSimplifier /></TabsContent>
        <TabsContent value="tracker"><CycleTracker /></TabsContent>
      </Tabs>
    </div>
  );
}

function SymptomAssistant() {
  const analyze = useServerFn(analyzeSymptoms);
  const [symptoms, setSymptoms] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SymptomResult | null>(null);

  async function run() {
    if (symptoms.trim().length < 3) { toast.error("Describe your symptoms first."); return; }
    setLoading(true); setResult(null);
    try {
      const r = await analyze({ data: { symptoms, age: age ? Number(age) : undefined } });
      setResult(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not analyze right now.");
    } finally { setLoading(false); }
  }

  const urgencyColor: Record<string, string> = {
    "self-care": "bg-sage/15 text-sage border-sage/30",
    "see-a-doctor-soon": "bg-earth/10 text-earth border-earth/30",
    "urgent": "bg-orange-100 text-orange-900 border-orange-300",
    "emergency": "bg-red-100 text-red-900 border-red-400",
  };

  function buildReport(r: SymptomResult) {
    const date = new Date().toLocaleString();
    return [
      `HerSpace — Doctor-Ready Symptom Report`,
      `Generated: ${date}`,
      age ? `Patient age: ${age}` : "",
      "",
      `SYMPTOMS REPORTED`,
      symptoms,
      "",
      `URGENCY: ${r.urgency.replace(/-/g, " ").toUpperCase()}`,
      "",
      `SUMMARY`,
      r.plainEnglishSummary,
      "",
      `POSSIBLE CONDITIONS TO DISCUSS`,
      ...r.possibleConditions.map((c) => `• ${c.name} (confidence: ${c.confidence}) — ${c.why}`),
      "",
      `QUESTIONS FOR THE CLINICIAN`,
      ...r.questionsForYourDoctor.map((q) => `• ${q}`),
      "",
      `SELF-CARE SUGGESTIONS`,
      ...r.selfCareSuggestions.map((s) => `• ${s}`),
      "",
      r.redFlags.length ? `RED FLAGS — SEEK CARE IF NOTICED` : "",
      ...r.redFlags.map((s) => `• ${s}`),
      "",
      `DISCLAIMER`,
      r.disclaimer,
    ].filter(Boolean).join("\n");
  }

  function downloadReport() {
    if (!result) return;
    const blob = new Blob([buildReport(result)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `herspace-symptom-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    if (!result) return;
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) { toast.error("Allow pop-ups to print."); return; }
    const safe = buildReport(result).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
    w.document.write(`<!doctype html><html><head><title>HerSpace Symptom Report</title>
      <style>body{font:14px/1.55 Georgia,serif;max-width:680px;margin:40px auto;padding:0 24px;color:#2a241e}
      pre{white-space:pre-wrap;font-family:inherit}h1{font-style:italic;font-weight:500;font-size:22px;margin:0 0 8px}</style>
      </head><body><h1>HerSpace · Symptom Report</h1><pre>${safe}</pre>
      <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  }

  return (
    <div className="grid md:grid-cols-5 gap-6">
      <Card className="md:col-span-2">
        <CardHeader><CardTitle className="font-serif italic text-2xl">Describe what you're experiencing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sym">Symptoms</Label>
            <Textarea id="sym" rows={6} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="e.g. irregular periods for 3 months, acne on jaw, hair thinning…" maxLength={2000} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="age">Age (optional)</Label>
            <Input id="age" type="number" min={10} max={110} value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <Button onClick={run} disabled={loading} className="w-full rounded-full bg-earth text-earth-foreground hover:brightness-110">
            {loading ? "Analyzing…" : "Analyze symptoms"}
          </Button>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            HerSpace AI is an educational tool. It does not diagnose. For emergencies, call your local emergency number.
          </p>
        </CardContent>
      </Card>

      <div className="md:col-span-3 space-y-4">
        {!result && !loading && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              Your structured analysis will appear here.
            </CardContent>
          </Card>
        )}
        {loading && <Card><CardContent className="p-8 text-muted-foreground">Thinking carefully…</CardContent></Card>}
        {result && (
          <>
            {result.urgency === "emergency" && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>This may need urgent care</AlertTitle>
                <AlertDescription>Please contact emergency services or go to the nearest ER.</AlertDescription>
              </Alert>
            )}
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <CardTitle className="font-serif italic text-2xl">Summary</CardTitle>
                <Badge className={urgencyColor[result.urgency] ?? ""}>{result.urgency.replace(/-/g, " ")}</Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="leading-relaxed">{result.plainEnglishSummary}</p>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={downloadReport} variant="outline" size="sm" className="rounded-full gap-2">
                    <FileDown className="h-3.5 w-3.5" /> Download doctor-ready report
                  </Button>
                  <Button onClick={printReport} variant="outline" size="sm" className="rounded-full gap-2">
                    <Printer className="h-3.5 w-3.5" /> Print / Save as PDF
                  </Button>
                </div>

                <Section title="Possible things to discuss with a clinician">
                  <ul className="space-y-3">
                    {result.possibleConditions.map((c) => (
                      <li key={c.name} className="rounded-xl border border-border p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{c.name}</span>
                          <Badge variant="outline" className="text-[10px]">confidence: {c.confidence}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{c.why}</p>
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section title="Questions to bring to your doctor">
                  <ul className="list-disc pl-5 space-y-1.5 text-sm">
                    {result.questionsForYourDoctor.map((q) => <li key={q}>{q}</li>)}
                  </ul>
                </Section>

                <Section title="Gentle self-care">
                  <ul className="list-disc pl-5 space-y-1.5 text-sm">
                    {result.selfCareSuggestions.map((s) => <li key={s}>{s}</li>)}
                  </ul>
                </Section>

                {result.redFlags.length > 0 && (
                  <Section title="Red flags — seek care if you notice">
                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-red-700">
                      {result.redFlags.map((r) => <li key={r}>{r}</li>)}
                    </ul>
                  </Section>
                )}

                <p className="text-xs text-muted-foreground italic border-t border-border pt-4">{result.disclaimer}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">{title}</h4>
      {children}
    </div>
  );
}

function ResearchSimplifier() {
  const simplify = useServerFn(simplifyResearch);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);

  async function run() {
    if (!topic.trim()) return;
    setLoading(true); setResult(null);
    try { setResult(await simplify({ data: { topic } })); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not load research."); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 flex flex-col md:flex-row gap-3">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. PCOS, endometriosis, perimenopause sleep, breast self-exam…" maxLength={200} />
          <Button onClick={run} disabled={loading} className="rounded-full bg-earth text-earth-foreground hover:brightness-110">
            {loading ? "Reading…" : "Simplify research"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card><CardHeader><CardTitle className="font-serif italic">Beginner explanation</CardTitle></CardHeader><CardContent className="text-sm leading-relaxed">{result.beginnerExplanation}</CardContent></Card>
          <Card><CardHeader><CardTitle className="font-serif italic">Key findings</CardTitle></CardHeader><CardContent><ul className="list-disc pl-5 space-y-1.5 text-sm">{result.keyFindings.map((f) => <li key={f}>{f}</li>)}</ul></CardContent></Card>
          <Card><CardHeader><CardTitle className="font-serif italic">Practical takeaways</CardTitle></CardHeader><CardContent><ul className="list-disc pl-5 space-y-1.5 text-sm">{result.practicalTakeaways.map((f) => <li key={f}>{f}</li>)}</ul></CardContent></Card>
          <Card><CardHeader><CardTitle className="font-serif italic">Myth vs fact</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
            {result.mythVsFact.map((m, i) => (<div key={i}><p className="text-muted-foreground line-through">{m.myth}</p><p>{m.fact}</p></div>))}
          </CardContent></Card>
          <Card className="md:col-span-2"><CardHeader><CardTitle className="font-serif italic">FAQs</CardTitle></CardHeader><CardContent className="space-y-4 text-sm">
            {result.faqs.map((q, i) => (<div key={i}><p className="font-medium">{q.q}</p><p className="text-muted-foreground mt-1">{q.a}</p></div>))}
          </CardContent></Card>
          <Card className="md:col-span-2"><CardHeader><CardTitle className="font-serif italic">Try these PubMed/NIH searches</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">
            {result.suggestedSearches.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
          </CardContent></Card>
        </div>
      )}
    </div>
  );
}

type CycleRow = { id: string; entry_date: string; flow: string | null; mood: string | null; energy: number | null; symptoms: string[] | null; notes: string | null };

function CycleTracker() {
  const [rows, setRows] = useState<CycleRow[]>([]);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [flow, setFlow] = useState("");
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const { data } = await supabase.from("cycle_entries").select("*").order("entry_date", { ascending: false }).limit(30);
    setRows((data as CycleRow[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Sign in required"); setLoading(false); return; }
    const { error } = await supabase.from("cycle_entries").upsert({
      user_id: u.user.id,
      entry_date: entryDate,
      flow: flow || null,
      mood: mood || null,
      energy: energy ? Number(energy) : null,
      notes: notes || null,
    }, { onConflict: "user_id,entry_date" });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Logged.");
    setNotes("");
    load();
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="font-serif italic">Today's check-in</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} /></div>
            <div><Label>Flow</Label><Input value={flow} onChange={(e) => setFlow(e.target.value)} placeholder="none / light / heavy" /></div>
            <div><Label>Mood</Label><Input value={mood} onChange={(e) => setMood(e.target.value)} placeholder="calm / anxious…" /></div>
            <div><Label>Energy 1–10</Label><Input type="number" min={1} max={10} value={energy} onChange={(e) => setEnergy(e.target.value)} /></div>
          </div>
          <div><Label>Notes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <Button onClick={save} disabled={loading} className="rounded-full bg-earth text-earth-foreground hover:brightness-110">Save entry</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="font-serif italic">Recent</CardTitle></CardHeader>
        <CardContent className="space-y-3 max-h-[420px] overflow-auto">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No entries yet.</p>}
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-border p-3 text-sm">
              <div className="flex justify-between mb-1">
                <span className="font-medium">{r.entry_date}</span>
                {r.flow && <Badge variant="outline">{r.flow}</Badge>}
              </div>
              <p className="text-muted-foreground text-xs">Mood: {r.mood ?? "—"} · Energy: {r.energy ?? "—"}</p>
              {r.notes && <p className="text-xs mt-1">{r.notes}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}