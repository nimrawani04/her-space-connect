import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

const MOODS = ["happy", "calm", "irritable", "sad", "anxious", "emotional", "motivated", "stressed"];
const ENERGY = ["Very low", "Low", "Moderate", "High", "Very high"];
const EXERCISE = ["walking", "running", "gym", "yoga", "pilates", "cycling", "rest day"];
const SYMPTOMS = ["acne", "hair fall", "bloating", "fatigue", "headache", "cramps", "breast pain", "constipation", "diarrhea", "dizziness", "nausea", "hot flashes"];
const NUTRITION_FLAGS = ["healthy meals", "junk food", "sugar cravings", "protein", "fruits & veg"];

type Sev = 1 | 2 | 3;

export function DailyWellness() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [mood, setMood] = useState<string[]>([]);
  const [energy, setEnergy] = useState<number>(3);
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [sleepQuality, setSleepQuality] = useState<number>(3);
  const [water, setWater] = useState<number>(6);
  const [exercise, setExercise] = useState<string[]>([]);
  const [nutrition, setNutrition] = useState<Record<string, boolean>>({});
  const [symptoms, setSymptoms] = useState<Record<string, Sev>>({});
  const [custom, setCustom] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase.from("wellness_logs").select("*").order("log_date", { ascending: false }).limit(14);
    setRecent(data ?? []);
    const todayRow = data?.find((r: any) => r.log_date === date);
    if (todayRow) {
      setMood(todayRow.mood ?? []);
      setEnergy(todayRow.energy_level ?? 3);
      setSleepHours(todayRow.sleep_hours ?? 7);
      setSleepQuality(todayRow.sleep_quality ?? 3);
      setWater(todayRow.water_glasses ?? 6);
      setExercise(todayRow.exercise ?? []);
      setNutrition((todayRow.nutrition as Record<string, boolean>) ?? {});
      setSymptoms((todayRow.symptoms as Record<string, Sev>) ?? {});
      setCustom(todayRow.custom_symptoms ?? []);
      setNotes(todayRow.notes ?? "");
    }
  }
  useEffect(() => { load(); }, [date]);

  function toggle<T>(list: T[], item: T): T[] {
    return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
  }
  function cycleSeverity(s: string) {
    setSymptoms((cur) => {
      const v = cur[s];
      const next = { ...cur };
      if (!v) next[s] = 1;
      else if (v === 1) next[s] = 2;
      else if (v === 2) next[s] = 3;
      else delete next[s];
      return next;
    });
  }

  async function save() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Sign in required"); setLoading(false); return; }
    const { error } = await supabase.from("wellness_logs").upsert({
      user_id: u.user.id,
      log_date: date,
      mood,
      energy_level: energy,
      sleep_hours: sleepHours,
      sleep_quality: sleepQuality,
      water_glasses: water,
      exercise,
      nutrition,
      symptoms,
      custom_symptoms: custom,
      notes: notes || null,
    }, { onConflict: "user_id,log_date" });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Logged.");
    load();
  }

  function addCustom() {
    const v = customInput.trim().toLowerCase();
    if (!v || custom.includes(v)) return;
    setCustom([...custom, v]);
    setCustomInput("");
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="font-serif italic text-2xl flex items-center justify-between">
            Daily wellness
            <Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="w-auto" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field label="Mood">
            <ChipGroup items={MOODS} active={mood} onToggle={(m) => setMood(toggle(mood, m))} />
          </Field>

          <Field label={`Energy — ${ENERGY[energy - 1]}`}>
            <Slider value={[energy]} min={1} max={5} step={1} onValueChange={(v) => setEnergy(v[0])} />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={`Sleep — ${sleepHours} hrs`}>
              <Slider value={[sleepHours]} min={0} max={12} step={0.5} onValueChange={(v) => setSleepHours(v[0])} />
            </Field>
            <Field label={`Sleep quality — ${sleepQuality}/5`}>
              <Slider value={[sleepQuality]} min={1} max={5} step={1} onValueChange={(v) => setSleepQuality(v[0])} />
            </Field>
          </div>

          <Field label={`Water — ${water} glasses`}>
            <Slider value={[water]} min={0} max={16} step={1} onValueChange={(v) => setWater(v[0])} />
          </Field>

          <Field label="Exercise">
            <ChipGroup items={EXERCISE} active={exercise} onToggle={(x) => setExercise(toggle(exercise, x))} />
          </Field>

          <Field label="Nutrition">
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {NUTRITION_FLAGS.map((n) => (
                <button key={n} type="button" onClick={() => setNutrition({ ...nutrition, [n]: !nutrition[n] })}
                  className={`px-2.5 py-1 rounded-full text-xs border ${nutrition[n] ? "bg-earth text-earth-foreground border-earth" : "bg-background border-border hover:border-earth/40"}`}>
                  {n}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Symptoms">
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {[...SYMPTOMS, ...custom].map((s) => {
                const sev = symptoms[s];
                const tone = sev === 1 ? "bg-sage/20 text-sage border-sage/40"
                  : sev === 2 ? "bg-amber-100 text-amber-900 border-amber-300"
                  : sev === 3 ? "bg-rose-100 text-rose-900 border-rose-300"
                  : "bg-sand/40 text-earth border-transparent hover:border-earth/30";
                return (
                  <button key={s} type="button" onClick={() => cycleSeverity(s)}
                    className={`px-2.5 py-1 rounded-full text-xs border capitalize ${tone}`}>
                    {s}{sev && <span className="ml-1 opacity-70">· {sev === 1 ? "mild" : sev === 2 ? "moderate" : "severe"}</span>}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 mt-2">
              <Input value={customInput} onChange={(e) => setCustomInput(e.target.value)} placeholder="Add a custom symptom" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())} />
              <Button type="button" variant="outline" onClick={addCustom}>Add</Button>
            </div>
          </Field>

          <Field label="Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>

          <Button onClick={save} disabled={loading} className="w-full rounded-full bg-earth text-earth-foreground hover:brightness-110">
            {loading ? "Saving…" : "Save daily log"}
          </Button>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader><CardTitle className="font-serif italic">Last 14 days</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 14 }).map((_, i) => {
              const d = new Date(); d.setDate(d.getDate() - (13 - i));
              const ds = d.toISOString().slice(0, 10);
              const r = recent.find((x: any) => x.log_date === ds);
              const filled = !!r;
              return (
                <div key={ds} title={ds} className={`aspect-square rounded-md text-[10px] flex items-center justify-center ${filled ? "bg-earth/80 text-earth-foreground" : "bg-sand/40 text-muted-foreground"}`}>
                  {d.getDate()}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Filled = logged. Tap any day above to load it.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label><div className="mt-1.5">{children}</div></div>;
}

function ChipGroup({ items, active, onToggle }: { items: string[]; active: string[]; onToggle: (i: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <button key={i} type="button" onClick={() => onToggle(i)}
          className={`px-2.5 py-1 rounded-full text-xs border capitalize ${active.includes(i) ? "bg-earth text-earth-foreground border-earth" : "bg-background border-border hover:border-earth/40"}`}>
          {i}
        </button>
      ))}
    </div>
  );
}