import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

const PHASES = [
  {
    name: "Menstrual",
    range: "Day 1–5",
    tone: "bg-rose-100 text-rose-900 border-rose-200",
    bar: "bg-rose-300",
    effects: { Mood: "lower / reflective", Energy: "low", Appetite: "comfort cravings", Sleep: "may be restless", Focus: "softer", Exercise: "gentle (walks, yoga)", Skin: "more sensitive" },
  },
  {
    name: "Follicular",
    range: "Day 6–13",
    tone: "bg-amber-100 text-amber-900 border-amber-200",
    bar: "bg-amber-300",
    effects: { Mood: "uplifting", Energy: "rising", Appetite: "balanced", Sleep: "improving", Focus: "sharp", Exercise: "great for strength + new workouts", Skin: "clearer" },
  },
  {
    name: "Ovulation",
    range: "Day 14",
    tone: "bg-emerald-100 text-emerald-900 border-emerald-200",
    bar: "bg-emerald-300",
    effects: { Mood: "confident, social", Energy: "peak", Appetite: "lighter", Sleep: "good", Focus: "high", Exercise: "HIIT, performance peaks", Skin: "glowing; some breakouts possible" },
  },
  {
    name: "Luteal",
    range: "Day 15–28",
    tone: "bg-violet-100 text-violet-900 border-violet-200",
    bar: "bg-violet-300",
    effects: { Mood: "may dip in late luteal (PMS)", Energy: "tapering", Appetite: "rising; cravings late", Sleep: "may worsen pre-period", Focus: "needs more rest", Exercise: "moderate, recovery-focused", Skin: "more oily, breakouts possible" },
  },
];

export function PhaseTimeline() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif italic text-2xl">Hormone phase timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Educational estimates</AlertTitle>
          <AlertDescription>These are typical hormonal patterns — not your lab measurements. Individual cycles vary.</AlertDescription>
        </Alert>

        <div className="grid grid-cols-4 gap-2 text-center">
          {PHASES.map((p) => (
            <div key={p.name} className={`rounded-xl border p-3 ${p.tone}`}>
              <p className="text-xs uppercase tracking-wider">{p.name}</p>
              <p className="text-[11px] mt-0.5 opacity-80">{p.range}</p>
            </div>
          ))}
        </div>

        <div className="flex h-2 rounded-full overflow-hidden">
          {PHASES.map((p, i) => (
            <div key={i} className={`${p.bar}`} style={{ width: i === 2 ? "5%" : i === 0 ? "18%" : i === 1 ? "28%" : "49%" }} />
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {PHASES.map((p) => (
            <div key={p.name} className="rounded-xl border border-border p-4">
              <p className="font-serif italic text-lg">{p.name}</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{p.range}</p>
              <ul className="mt-3 space-y-1 text-sm">
                {Object.entries(p.effects).map(([k, v]) => (
                  <li key={k}><span className="text-muted-foreground">{k}:</span> {v}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}