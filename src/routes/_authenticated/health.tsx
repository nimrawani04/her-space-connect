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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const symptomExamples = [
  { category: "Period & cycle", examples: ["irregular periods", "heavy bleeding", "period cramps", "spotting between periods", "missed period"] },
  { category: "Skin & hair", examples: ["acne on jaw", "hair thinning", "excess facial hair", "dry skin", "oily scalp"] },
  { category: "Mood & sleep", examples: ["anxiety", "low mood", "trouble sleeping", "mood swings", "brain fog"] },
  { category: "Pain & body", examples: ["pelvic pain", "lower back pain", "bloating", "breast tenderness", "headaches"] },
  { category: "Sexual & urinary", examples: ["painful intercourse", "vaginal dryness", "UTI symptoms", "itching", "unusual discharge"] },
  { category: "Hormonal", examples: ["hot flashes", "night sweats", "weight gain", "fatigue", "decreased libido"] },
];

function SymptomQuickAdd({ symptoms, onChange }: { symptoms: string; onChange: (v: string) => void }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const categories = ["All", ...symptomExamples.map((c) => c.category)];
  const visible = activeCategory === "All"
    ? symptomExamples.flatMap((c) => c.examples)
    : symptomExamples.find((c) => c.category === activeCategory)?.examples ?? [];

  function add(example: string) {
    const trimmed = symptoms.trim();
    if (!trimmed) { onChange(example); return; }
    if (trimmed.toLowerCase().includes(example.toLowerCase())) return;
    const sep = /[,\.]$/.test(trimmed) ? " " : ", ";
    onChange(`${trimmed}${sep}${example}`);
  }

  return (
    <div className="space-y-3 pt-1">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Start faster</p>
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs border transition-colors ${
              activeCategory === cat
                ? "bg-earth text-earth-foreground border-earth"
                : "bg-background text-foreground border-border hover:border-earth/40"
            }`}
            aria-pressed={activeCategory === cat}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {visible.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => add(ex)}
            className="px-2.5 py-1 rounded-full text-xs bg-sand/50 text-earth border border-transparent hover:border-earth/30 hover:bg-sand transition-colors"
            aria-label={`Add ${ex}`}
          >
            + {ex}
          </button>
        ))}
      </div>
    </div>
  );
}

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
          <TabsTrigger value="hormones">Cycle & Hormones</TabsTrigger>
        </TabsList>

        <TabsContent value="symptoms"><SymptomAssistant /></TabsContent>
        <TabsContent value="research"><ResearchSimplifier /></TabsContent>
        <TabsContent value="tracker"><CycleTracker /></TabsContent>
        <TabsContent value="hormones"><HormoneCycle /></TabsContent>
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
            <SymptomQuickAdd symptoms={symptoms} onChange={setSymptoms} />
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

type Severity = 1 | 2 | 3;
type SeverityMap = Record<string, Severity>;
type CycleRow = { id: string; entry_date: string; flow: string | null; mood: string | null; energy: number | null; symptoms: string[] | null; symptom_severities: SeverityMap | null; notes: string | null };

const SEVERITY_META: Record<Severity, { label: string; tone: string; dot: string }> = {
  1: { label: "mild",     tone: "bg-sage/20 text-sage border-sage/40",           dot: "bg-sage" },
  2: { label: "moderate", tone: "bg-amber-100 text-amber-900 border-amber-300",  dot: "bg-amber-500" },
  3: { label: "severe",   tone: "bg-rose-100 text-rose-900 border-rose-300",     dot: "bg-rose-500" },
};

const SYMPTOM_OPTIONS = [
  "cramps", "acne", "mood swings", "fatigue", "bloating", "headache",
  "breast tenderness", "cravings", "low energy", "anxiety", "insomnia",
  "high libido", "low libido", "back pain", "nausea", "clear skin", "focused",
];

function CycleTracker() {
  const [rows, setRows] = useState<CycleRow[]>([]);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [flow, setFlow] = useState("");
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState("");
  const [notes, setNotes] = useState("");
  const [severities, setSeverities] = useState<SeverityMap>({});
  const [loading, setLoading] = useState(false);

  async function load() {
    const { data } = await supabase.from("cycle_entries").select("*").order("entry_date", { ascending: false }).limit(30);
    setRows((data as CycleRow[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  // Cycle: off → mild (1) → moderate (2) → severe (3) → off
  function cycleSymptom(s: string) {
    setSeverities((cur) => {
      const next = { ...cur };
      const v = cur[s];
      if (!v) next[s] = 1;
      else if (v === 1) next[s] = 2;
      else if (v === 2) next[s] = 3;
      else delete next[s];
      return next;
    });
  }
  function clearSymptom(s: string) {
    setSeverities((cur) => {
      if (!cur[s]) return cur;
      const next = { ...cur };
      delete next[s];
      return next;
    });
  }

  async function save() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Sign in required"); setLoading(false); return; }
    const symptomKeys = Object.keys(severities);
    const { error } = await supabase.from("cycle_entries").upsert({
      user_id: u.user.id,
      entry_date: entryDate,
      flow: flow || null,
      mood: mood || null,
      energy: energy ? Number(energy) : null,
      symptoms: symptomKeys.length ? symptomKeys : null,
      symptom_severities: symptomKeys.length ? severities : null,
      notes: notes || null,
    }, { onConflict: "user_id,entry_date" });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Logged.");
    setNotes("");
    setSeverities({});
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
          <div>
            <Label>Symptoms today</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {SYMPTOM_OPTIONS.map((s) => {
                const sev = severities[s];
                const meta = sev ? SEVERITY_META[sev] : null;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => cycleSymptom(s)}
                    onContextMenu={(e) => { e.preventDefault(); clearSymptom(s); }}
                    aria-pressed={!!sev}
                    title={sev ? `${meta!.label} — tap to change, right-click to clear` : "Tap to add"}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors flex items-center gap-1.5 ${
                      sev ? meta!.tone : "bg-sand/40 text-earth border-transparent hover:border-earth/30"
                    }`}
                  >
                    {sev
                      ? <span className={`inline-block w-1.5 h-1.5 rounded-full ${meta!.dot}`} />
                      : <span aria-hidden>+</span>}
                    <span>{s}</span>
                    {sev && <span className="text-[10px] opacity-70">· {meta!.label}</span>}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Tap once for <span className="text-sage">mild</span>, again for <span className="text-amber-700">moderate</span>, again for <span className="text-rose-700">severe</span>, again to clear. Right-click to remove. Severity weights the cycle-phase correlations.
            </p>
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
              {r.symptoms && r.symptoms.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {r.symptoms.map((s) => {
                    const sev = (r.symptom_severities ?? {})[s] as Severity | undefined;
                    const meta = sev ? SEVERITY_META[sev] : null;
                    return (
                      <Badge
                        key={s}
                        variant="outline"
                        className={`text-[10px] ${meta ? meta.tone : ""}`}
                      >
                        {s}{meta ? ` · ${meta.label}` : ""}
                      </Badge>
                    );
                  })}
                </div>
              )}
              {r.notes && <p className="text-xs mt-1">{r.notes}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cycle phase + hormone visualization
// ─────────────────────────────────────────────────────────────────────────────

type Phase = "menstrual" | "follicular" | "ovulation" | "luteal";

const PHASE_INFO: Record<Phase, { label: string; days: string; tone: string; body: string; dominant: string[] }> = {
  menstrual: {
    label: "Menstrual phase",
    days: "Day 1 – 5",
    tone: "bg-rose-100 text-rose-900 border-rose-300",
    body: "The uterine lining sheds. Estrogen and progesterone are at their lowest. Energy is often lower — rest is biologically appropriate.",
    dominant: ["Estrogen ↓", "Progesterone ↓"],
  },
  follicular: {
    label: "Follicular phase",
    days: "Day 6 – 13",
    tone: "bg-amber-100 text-amber-900 border-amber-300",
    body: "FSH rises, ovarian follicles mature, estrogen climbs. Skin clears, mood and focus lift, strength training feels easier.",
    dominant: ["FSH ↑", "Estrogen ↑"],
  },
  ovulation: {
    label: "Ovulation",
    days: "≈ Day 14",
    tone: "bg-emerald-100 text-emerald-900 border-emerald-300",
    body: "A surge of LH releases an egg. Estrogen peaks, then drops. Libido and communication often peak here too.",
    dominant: ["LH ↑↑", "Estrogen peak"],
  },
  luteal: {
    label: "Luteal phase",
    days: "Day 15 – 28",
    tone: "bg-violet-100 text-violet-900 border-violet-300",
    body: "The corpus luteum produces progesterone, which calms but can bring PMS, bloating, lower energy, and cravings in the late luteal phase.",
    dominant: ["Progesterone ↑", "Estrogen mild ↑"],
  },
};

function phaseForDay(day: number, cycleLength: number): Phase {
  if (day <= 5) return "menstrual";
  const ovDay = cycleLength - 14; // luteal ≈ 14 days
  if (day < ovDay) return "follicular";
  if (day <= ovDay + 1) return "ovulation";
  return "luteal";
}

// Approximate normalized hormone levels (0–100) across a 28-day cycle.
// Educational only — real levels vary widely.
function hormoneLevel(hormone: "estrogen" | "progesterone" | "lh" | "fsh", day: number, cycleLength: number) {
  const ov = cycleLength - 14;
  const t = day;
  const bump = (center: number, width: number, height: number) =>
    height * Math.exp(-((t - center) ** 2) / (2 * width ** 2));
  switch (hormone) {
    case "estrogen":
      // small follicular rise, peak just before ovulation, secondary luteal hump
      return Math.min(100, 15 + bump(ov - 1, 3, 75) + bump(ov + 7, 5, 40));
    case "progesterone":
      // low until ovulation, big luteal hump
      return Math.min(100, 5 + bump(ov + 7, 4.5, 85));
    case "lh":
      // tight spike at ovulation
      return Math.min(100, 8 + bump(ov, 1.1, 90));
    case "fsh":
      // small early-follicular bump + smaller ovulatory bump
      return Math.min(100, 12 + bump(2, 2.5, 35) + bump(ov, 1.6, 30));
  }
}

const HORMONES: Array<{
  key: "estrogen" | "progesterone" | "lh" | "fsh";
  label: string;
  color: string;
  what: string;
}> = [
  { key: "estrogen", label: "Estrogen", color: "#d946ef", what: "Builds uterine lining, lifts mood and skin, peaks just before ovulation." },
  { key: "progesterone", label: "Progesterone", color: "#8b5cf6", what: "Calming hormone of the luteal phase. Stabilises mood, raises body temperature." },
  { key: "lh", label: "LH (Luteinizing)", color: "#10b981", what: "Surges to trigger ovulation. Detected by ovulation predictor kits." },
  { key: "fsh", label: "FSH (Follicle-stim.)", color: "#f59e0b", what: "Recruits and matures ovarian follicles early in the cycle." },
];

function HormoneCycle() {
  const [lastPeriod, setLastPeriod] = useState<string>("");
  const [cycleLength, setCycleLength] = useState<number>(28);
  const [irregularity, setIrregularity] = useState<"regular" | "somewhat" | "very">("regular");
  const [detectedAvg, setDetectedAvg] = useState<{ avg: number; spread: number; cycles: number } | null>(null);
  const [periodStarts, setPeriodStarts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Hydrate saved preferences
  useEffect(() => {
    try {
      const raw = localStorage.getItem("herspace.cyclePrefs");
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.cycleLength === "number") setCycleLength(p.cycleLength);
        if (p.irregularity === "regular" || p.irregularity === "somewhat" || p.irregularity === "very") {
          setIrregularity(p.irregularity);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Persist preferences
  useEffect(() => {
    try {
      localStorage.setItem("herspace.cyclePrefs", JSON.stringify({ cycleLength, irregularity }));
    } catch { /* ignore */ }
  }, [cycleLength, irregularity]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("cycle_entries")
        .select("entry_date, flow")
        .order("entry_date", { ascending: false })
        .limit(60);
      const rows = (data ?? []) as Array<{ entry_date: string; flow: string | null }>;
      // Detect last period start = earliest day of the most recent contiguous run of "flow" entries
      const flowDays = rows
        .filter((r) => r.flow && !["none", "spotting"].includes(r.flow.toLowerCase()))
        .map((r) => r.entry_date)
        .sort();
      if (flowDays.length > 0) {
        // group contiguous, take last group's first day
        let group: string[] = [flowDays[0]];
        const groups: string[][] = [group];
        for (let i = 1; i < flowDays.length; i++) {
          const prev = new Date(flowDays[i - 1]);
          const cur = new Date(flowDays[i]);
          const diff = (cur.getTime() - prev.getTime()) / 86400000;
          if (diff <= 2) group.push(flowDays[i]);
          else { group = [flowDays[i]]; groups.push(group); }
        }
        const starts = groups.map((g) => g[0]).sort((a, b) => (a < b ? 1 : -1)); // newest first
        setPeriodStarts(starts);
        setLastPeriod(starts[0]);
        // Compute cycle length stats from gaps between period starts
        if (groups.length >= 2) {
          const startTimes = groups.map((g) => new Date(g[0]).getTime()).sort((a, b) => a - b);
          const gaps: number[] = [];
          for (let i = 1; i < startTimes.length; i++) {
            const d = Math.round((startTimes[i] - startTimes[i - 1]) / 86400000);
            if (d >= 18 && d <= 60) gaps.push(d);
          }
          if (gaps.length > 0) {
            const avg = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
            const spread = Math.round(Math.max(...gaps) - Math.min(...gaps));
            setDetectedAvg({ avg, spread, cycles: gaps.length });
          }
        }
      }
      setLoading(false);
    })();
  }, []);

  const IRREG_DAYS: Record<typeof irregularity, number> = { regular: 2, somewhat: 5, very: 8 };
  const tolerance = IRREG_DAYS[irregularity];

  const today = new Date();
  const cycleDay = lastPeriod
    ? Math.max(1, Math.min(cycleLength, Math.floor((today.getTime() - new Date(lastPeriod).getTime()) / 86400000) % cycleLength + 1))
    : null;
  const currentPhase = cycleDay ? phaseForDay(cycleDay, cycleLength) : null;
  const nextPeriod = lastPeriod
    ? new Date(new Date(lastPeriod).getTime() + cycleLength * 86400000).toISOString().slice(0, 10)
    : null;
  const ovulationDate = lastPeriod
    ? new Date(new Date(lastPeriod).getTime() + (cycleLength - 14) * 86400000).toISOString().slice(0, 10)
    : null;
  const fmt = (iso: string, deltaDays: number) =>
    new Date(new Date(iso).getTime() + deltaDays * 86400000).toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif italic text-2xl">Where you are in your cycle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <Label>Last period started</Label>
              <Input type="date" value={lastPeriod} onChange={(e) => setLastPeriod(e.target.value)} />
            </div>
            <div>
              <Label>Anchor from your logs</Label>
              <Select
                value={periodStarts.includes(lastPeriod) ? lastPeriod : "__custom"}
                onValueChange={(v) => { if (v !== "__custom") setLastPeriod(v); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={periodStarts.length ? "Pick a period start" : "No logged periods"} />
                </SelectTrigger>
                <SelectContent>
                  {periodStarts.length === 0 && (
                    <SelectItem value="__none" disabled>No period entries yet</SelectItem>
                  )}
                  {periodStarts.map((d, i) => (
                    <SelectItem key={d} value={d}>
                      {d}{i === 0 ? " · most recent" : i === 1 ? " · previous" : ` · ${i + 1} cycles ago`}
                    </SelectItem>
                  ))}
                  {!periodStarts.includes(lastPeriod) && lastPeriod && (
                    <SelectItem value="__custom" disabled>Custom date above</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Typical cycle length (days)</Label>
              <Input
                type="number"
                min={20}
                max={45}
                value={cycleLength}
                onChange={(e) => setCycleLength(Math.max(20, Math.min(45, Number(e.target.value) || 28)))}
              />
            </div>
            <div>
              <Label>How regular?</Label>
              <Select value={irregularity} onValueChange={(v) => setIrregularity(v as typeof irregularity)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular (±2 days)</SelectItem>
                  <SelectItem value="somewhat">Somewhat irregular (±5 days)</SelectItem>
                  <SelectItem value="very">Very irregular (±8+ days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground self-end leading-relaxed">
              {detectedAvg
                ? <>From your logs: avg <strong className="text-foreground">{detectedAvg.avg}d</strong>, varies ±{Math.ceil(detectedAvg.spread / 2)}d across {detectedAvg.cycles} cycle{detectedAvg.cycles > 1 ? "s" : ""}. <button type="button" className="underline text-earth" onClick={() => { setCycleLength(detectedAvg.avg); setIrregularity(detectedAvg.spread >= 14 ? "very" : detectedAvg.spread >= 6 ? "somewhat" : "regular"); }}>Use this</button></>
                : <>Auto-detected from your <strong>Cycle Tracker</strong> entries. Edit if needed.</>}
            </div>
          </div>

          {loading && <p className="text-sm text-muted-foreground">Reading your entries…</p>}

          {!loading && !cycleDay && (
            <Alert>
              <AlertTitle>No period date yet</AlertTitle>
              <AlertDescription>
                Pick when your last period started, or log a "light/medium/heavy" flow day in <strong>Cycle Tracker</strong> so we can estimate your phase automatically.
              </AlertDescription>
            </Alert>
          )}

          {cycleDay && currentPhase && (
            <div className="rounded-2xl border border-border p-5 bg-sand/30 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className={PHASE_INFO[currentPhase].tone}>{PHASE_INFO[currentPhase].label}</Badge>
                <span className="text-sm text-muted-foreground">
                  Day <strong className="text-foreground">{cycleDay}</strong> of {cycleLength} · {PHASE_INFO[currentPhase].days}
                </span>
                {irregularity !== "regular" && (
                  <Badge variant="outline" className="text-[10px]">±{tolerance}d window</Badge>
                )}
              </div>
              <p className="text-sm leading-relaxed">{PHASE_INFO[currentPhase].body}</p>
              {irregularity === "very" && (
                <p className="text-xs text-muted-foreground italic">
                  Because your cycles vary widely, treat the day count as a rough estimate. Phase is most reliable when confirmed with body signs (cervical fluid, basal temperature, an LH test).
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {PHASE_INFO[currentPhase].dominant.map((d) => (
                  <Badge key={d} variant="outline">{d}</Badge>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
                <div>
                  Estimated ovulation:{" "}
                  <strong className="text-foreground">{ovulationDate}</strong>
                  {ovulationDate && tolerance > 0 && (
                    <span className="text-muted-foreground"> (window {fmt(ovulationDate, -tolerance)} → {fmt(ovulationDate, tolerance)})</span>
                  )}
                </div>
                <div>
                  Next period (est.):{" "}
                  <strong className="text-foreground">{nextPeriod}</strong>
                  {nextPeriod && tolerance > 0 && (
                    <span className="text-muted-foreground"> (window {fmt(nextPeriod, -tolerance)} → {fmt(nextPeriod, tolerance)})</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif italic text-2xl">Hormones across your cycle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <HormoneChart cycleLength={cycleLength} cycleDay={cycleDay} tolerance={tolerance} />
          <div className="grid sm:grid-cols-2 gap-3">
            {HORMONES.map((h) => (
              <div key={h.key} className="rounded-xl border border-border p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ background: h.color }} />
                  <span className="font-medium">{h.label}</span>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">{h.what}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground italic">
            Curves are educational approximations of a textbook 28-day cycle, scaled to your cycle length. Real hormone levels vary widely between bodies and cycles — use this to understand the pattern, not to diagnose.
          </p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-4 gap-3">
        {(["menstrual", "follicular", "ovulation", "luteal"] as Phase[]).map((p) => (
          <div key={p} className={`rounded-2xl border p-4 ${currentPhase === p ? "ring-2 ring-earth/50" : ""}`}>
            <Badge className={PHASE_INFO[p].tone}>{PHASE_INFO[p].label}</Badge>
            <p className="text-xs text-muted-foreground mt-2">{PHASE_INFO[p].days}</p>
            <p className="text-sm mt-2 leading-relaxed">{PHASE_INFO[p].body}</p>
          </div>
        ))}
      </div>

      <SymptomCorrelations periodStarts={periodStarts} cycleLength={cycleLength} />
    </div>
  );
}

function HormoneChart({ cycleLength, cycleDay, tolerance = 0 }: { cycleLength: number; cycleDay: number | null; tolerance?: number }) {
  const W = 720;
  const H = 240;
  const PAD_L = 36;
  const PAD_R = 12;
  const PAD_T = 16;
  const PAD_B = 28;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const days = Array.from({ length: cycleLength }, (_, i) => i + 1);
  const x = (d: number) => PAD_L + ((d - 1) / (cycleLength - 1)) * innerW;
  const y = (v: number) => PAD_T + (1 - v / 100) * innerH;

  const ovDay = cycleLength - 14;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px] h-auto">
        {/* phase bands */}
        <rect x={x(1)} y={PAD_T} width={x(5) - x(1)} height={innerH} fill="#fecdd3" opacity={0.35} />
        <rect x={x(6)} y={PAD_T} width={x(ovDay - 1) - x(6)} height={innerH} fill="#fde68a" opacity={0.3} />
        <rect x={x(ovDay)} y={PAD_T} width={x(ovDay + 1) - x(ovDay)} height={innerH} fill="#a7f3d0" opacity={0.5} />
        <rect x={x(ovDay + 2)} y={PAD_T} width={x(cycleLength) - x(ovDay + 2)} height={innerH} fill="#ddd6fe" opacity={0.35} />

        {/* axes */}
        <line x1={PAD_L} y1={PAD_T + innerH} x2={PAD_L + innerW} y2={PAD_T + innerH} stroke="currentColor" opacity={0.2} />
        {[1, 7, 14, 21, 28].filter((d) => d <= cycleLength).map((d) => (
          <g key={d}>
            <line x1={x(d)} y1={PAD_T + innerH} x2={x(d)} y2={PAD_T + innerH + 4} stroke="currentColor" opacity={0.4} />
            <text x={x(d)} y={PAD_T + innerH + 18} fontSize="10" textAnchor="middle" fill="currentColor" opacity={0.6}>
              Day {d}
            </text>
          </g>
        ))}

        {/* hormone curves */}
        {HORMONES.map((h) => {
          const path = days
            .map((d, i) => `${i === 0 ? "M" : "L"} ${x(d).toFixed(1)} ${y(hormoneLevel(h.key, d, cycleLength)).toFixed(1)}`)
            .join(" ");
          return <path key={h.key} d={path} fill="none" stroke={h.color} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />;
        })}

        {/* today marker */}
        {cycleDay && (
          <g>
            {tolerance > 0 && (
              <rect
                x={x(Math.max(1, cycleDay - tolerance))}
                y={PAD_T}
                width={x(Math.min(cycleLength, cycleDay + tolerance)) - x(Math.max(1, cycleDay - tolerance))}
                height={innerH}
                fill="#1f2937"
                opacity={0.08}
              />
            )}
            <line x1={x(cycleDay)} y1={PAD_T} x2={x(cycleDay)} y2={PAD_T + innerH} stroke="#1f2937" strokeDasharray="4 4" opacity={0.6} />
            <circle cx={x(cycleDay)} cy={PAD_T + 6} r={4} fill="#1f2937" />
            <text x={x(cycleDay)} y={PAD_T - 4} fontSize="10" textAnchor="middle" fill="#1f2937">
              Today · Day {cycleDay}{tolerance > 0 ? ` (±${tolerance}d)` : ""}
            </text>
          </g>
        )}

        {/* legend */}
        <g transform={`translate(${PAD_L}, ${H - 6})`}>
          {HORMONES.map((h, i) => (
            <g key={h.key} transform={`translate(${i * 130}, 0)`}>
              <rect x={0} y={-8} width={10} height={3} fill={h.color} />
              <text x={14} y={-4} fontSize="10" fill="currentColor" opacity={0.75}>{h.label}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Symptom × cycle-phase correlations
// ─────────────────────────────────────────────────────────────────────────────

function SymptomCorrelations({ periodStarts, cycleLength }: { periodStarts: string[]; cycleLength: number }) {
  const [entries, setEntries] = useState<Array<{ entry_date: string; symptoms: string[] | null; symptom_severities: SeverityMap | null; mood: string | null; energy: number | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("cycle_entries")
        .select("entry_date, symptoms, symptom_severities, mood, energy")
        .order("entry_date", { ascending: false })
        .limit(180);
      setEntries((data ?? []) as typeof entries);
      setLoading(false);
    })();
  }, []);

  // Map an entry date → cycle day using the most recent period start that is ≤ that date.
  const anchors = [...periodStarts].sort(); // ascending
  function cycleDayFor(date: string): number | null {
    if (anchors.length === 0) return null;
    const t = new Date(date).getTime();
    let anchor: string | null = null;
    for (const a of anchors) {
      if (new Date(a).getTime() <= t) anchor = a;
      else break;
    }
    if (!anchor) return null;
    const diff = Math.floor((t - new Date(anchor).getTime()) / 86400000);
    if (diff < 0 || diff > 60) return null;
    return (diff % cycleLength) + 1;
  }

  const phases: Phase[] = ["menstrual", "follicular", "ovulation", "luteal"];
  const phaseDayCounts: Record<Phase, number> = { menstrual: 0, follicular: 0, ovulation: 0, luteal: 0 };
  // count = number of days logged with that symptom in that phase
  // severity = sum of severity scores (1/2/3) for that symptom in that phase
  const matrix: Record<string, Record<Phase, { count: number; severity: number }>> = {};
  let totalDays = 0;

  for (const e of entries) {
    const day = cycleDayFor(e.entry_date);
    if (!day) continue;
    const phase = phaseForDay(day, cycleLength);
    phaseDayCounts[phase] += 1;
    totalDays += 1;
    const syms = e.symptoms ?? [];
    const sevs = e.symptom_severities ?? {};
    for (const s of syms) {
      if (!matrix[s]) matrix[s] = { menstrual: { count: 0, severity: 0 }, follicular: { count: 0, severity: 0 }, ovulation: { count: 0, severity: 0 }, luteal: { count: 0, severity: 0 } };
      const sev = (sevs[s] as Severity | undefined) ?? 2; // default to moderate for legacy entries
      matrix[s][phase].count += 1;
      matrix[s][phase].severity += sev;
    }
  }

  const symptomList = Object.keys(matrix).sort((a, b) => {
    const totA = phases.reduce((s, p) => s + matrix[a][p].severity, 0);
    const totB = phases.reduce((s, p) => s + matrix[b][p].severity, 0);
    return totB - totA;
  });

  // Build "insights": for each symptom, find the phase with the highest severity-weighted rate
  // (sum of severities / phaseDayCount). avgSev shown alongside.
  const insights: Array<{ symptom: string; phase: Phase; weighted: number; count: number; avgSev: number }> = [];
  for (const s of symptomList) {
    let best: { phase: Phase; weighted: number; count: number; avgSev: number } | null = null;
    for (const p of phases) {
      const denom = phaseDayCounts[p];
      if (denom < 2) continue; // need at least 2 logged days in that phase
      const cell = matrix[s][p];
      const weighted = cell.severity / denom; // 0..3
      const avgSev = cell.count > 0 ? cell.severity / cell.count : 0;
      if (weighted > 0 && (!best || weighted > best.weighted)) best = { phase: p, weighted, count: cell.count, avgSev };
    }
    if (best && best.count >= 2) insights.push({ symptom: s, ...best });
  }
  insights.sort((a, b) => b.weighted - a.weighted);

  const sevLabel = (avg: number) => avg >= 2.5 ? "mostly severe" : avg >= 1.75 ? "mostly moderate" : avg >= 1.25 ? "mild–moderate" : "mostly mild";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif italic text-2xl">Your symptom patterns by phase</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading && <p className="text-sm text-muted-foreground">Reading your logs…</p>}
        {!loading && (anchors.length === 0 || totalDays === 0) && (
          <Alert>
            <AlertTitle>Not enough data yet</AlertTitle>
            <AlertDescription>
              Log a few period days <strong>and</strong> tap symptoms in the <strong>Cycle Tracker</strong> for a couple of weeks. As soon as we can map symptoms to cycle days, your patterns will appear here.
            </AlertDescription>
          </Alert>
        )}

        {!loading && totalDays > 0 && symptomList.length === 0 && (
          <p className="text-sm text-muted-foreground">
            We mapped {totalDays} logged day{totalDays === 1 ? "" : "s"} to a cycle phase, but no symptoms are tagged yet. Tap symptom chips when you log a day.
          </p>
        )}

        {!loading && symptomList.length > 0 && (
          <>
            {insights.length > 0 && (
              <div className="rounded-2xl border border-border bg-sand/30 p-4 space-y-2">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">What we noticed</p>
                <ul className="text-sm space-y-1.5">
                  {insights.slice(0, 5).map((i) => (
                    <li key={i.symptom}>
                      Your <strong>{i.symptom}</strong> shows up most in the{" "}
                      <Badge className={PHASE_INFO[i.phase].tone + " align-middle"}>{PHASE_INFO[i.phase].label.replace(" phase", "")}</Badge>{" "}
                      <span className="text-muted-foreground">— {i.count} day{i.count === 1 ? "" : "s"}, {sevLabel(i.avgSev)} (avg {i.avgSev.toFixed(1)}/3).</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[480px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <th className="py-2 pr-3 font-normal">Symptom</th>
                    {phases.map((p) => (
                      <th key={p} className="py-2 px-2 font-normal text-center">
                        {PHASE_INFO[p].label.replace(" phase", "")}
                        <div className="text-[10px] text-muted-foreground/70 normal-case tracking-normal">
                          {phaseDayCounts[p]} day{phaseDayCounts[p] === 1 ? "" : "s"}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {symptomList.map((s) => {
                    const maxRow = Math.max(...phases.map((p) => matrix[s][p].severity));
                    return (
                      <tr key={s} className="border-t border-border">
                        <td className="py-2 pr-3 font-medium capitalize">{s}</td>
                        {phases.map((p) => {
                          const cell = matrix[s][p];
                          const count = cell.count;
                          const intensity = maxRow > 0 ? cell.severity / maxRow : 0;
                          const avgSev = count > 0 ? cell.severity / count : 0;
                          return (
                            <td key={p} className="py-1.5 px-2 text-center">
                              <div
                                className="mx-auto rounded-md text-xs font-medium flex items-center justify-center"
                                style={{
                                  width: 52,
                                  height: 28,
                                  background: count === 0 ? "transparent" : `color-mix(in oklab, var(--color-earth) ${15 + intensity * 65}%, transparent)`,
                                  color: intensity > 0.55 ? "white" : "inherit",
                                  border: count === 0 ? "1px dashed color-mix(in oklab, currentColor 20%, transparent)" : "none",
                                }}
                                title={count === 0
                                  ? `No ${s} logged in ${PHASE_INFO[p].label}`
                                  : `${count} day${count === 1 ? "" : "s"} in ${PHASE_INFO[p].label} · avg severity ${avgSev.toFixed(1)}/3`}
                              >
                                {count === 0 ? "·" : <span>{count}<span className="opacity-70 text-[10px]"> · {avgSev.toFixed(1)}</span></span>}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-muted-foreground italic">
              Each cell shows <strong>days logged</strong> · <strong>avg severity</strong> (1 mild → 3 severe). Shading reflects severity-weighted frequency, so a few severe days outweigh many mild ones. Patterns get more reliable after 2–3 logged cycles.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}