import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  MUCUS_OPTIONS, OV_TEST_OPTIONS, PRECONCEPTION_ITEMS, LEARN_PRECONCEPTION,
  fertileWindow, conceptionChanceToday, todayISO,
} from "@/lib/pregnancy";

type FertilityRow = {
  log_date: string; bbt_celsius: number | null; cervical_mucus: string | null;
  ovulation_test: string | null; intercourse: boolean; notes: string | null;
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function Planning() {
  const [date, setDate] = useState(todayISO());
  const [bbt, setBbt] = useState("");
  const [mucus, setMucus] = useState<string>("");
  const [ovTest, setOvTest] = useState<string>("not tested");
  const [intercourse, setIntercourse] = useState(false);
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<FertilityRow[]>([]);
  const [saving, setSaving] = useState(false);

  const [lastPeriod, setLastPeriod] = useState<string | null>(null);
  const [cycleLength, setCycleLength] = useState(28);

  const [checked, setChecked] = useState<Record<string, boolean>>({});

  async function load() {
    const [{ data: f }, { data: c }, { data: k }] = await Promise.all([
      supabase.from("fertility_logs").select("*").order("log_date", { ascending: false }).limit(60),
      supabase.from("cycle_entries").select("entry_date").order("entry_date", { ascending: false }).limit(1),
      supabase.from("preconception_checklist").select("item_key, done"),
    ]);
    setRows((f as unknown as FertilityRow[]) ?? []);
    if (c?.[0]) setLastPeriod((c[0] as { entry_date: string }).entry_date);
    const map: Record<string, boolean> = {};
    (k ?? []).forEach((r: { item_key: string; done: boolean }) => { map[r.item_key] = r.done; });
    setChecked(map);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const row = rows.find((r) => r.log_date === date);
    setBbt(row?.bbt_celsius != null ? String(row.bbt_celsius) : "");
    setMucus(row?.cervical_mucus ?? "");
    setOvTest(row?.ovulation_test ?? "not tested");
    setIntercourse(row?.intercourse ?? false);
    setNotes(row?.notes ?? "");
  }, [date, rows]);

  const window = useMemo(() => (lastPeriod ? fertileWindow(lastPeriod, cycleLength) : null), [lastPeriod, cycleLength]);
  const chance = useMemo(() => (window ? conceptionChanceToday(window.ovulation) : null), [window]);

  async function saveLog() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Sign in required"); setSaving(false); return; }
    const { error } = await supabase.from("fertility_logs").upsert({
      user_id: u.user.id,
      log_date: date,
      bbt_celsius: bbt ? Number(bbt) : null,
      cervical_mucus: mucus || null,
      ovulation_test: ovTest,
      intercourse,
      notes: notes || null,
    }, { onConflict: "user_id,log_date" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Fertility log saved.");
    load();
  }

  async function toggleItem(key: string, value: boolean) {
    setChecked((c) => ({ ...c, [key]: value }));
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("preconception_checklist").upsert(
      { user_id: u.user.id, item_key: key, done: value },
      { onConflict: "user_id,item_key" },
    );
  }

  const doneCount = PRECONCEPTION_ITEMS.filter((i) => checked[i.key]).length;
  const groups = Array.from(new Set(PRECONCEPTION_ITEMS.map((i) => i.group)));
  const bbtPoints = [...rows].filter((r) => r.bbt_celsius != null).slice(0, 21).reverse();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif italic text-2xl">Fertility tracker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label>Last period started</Label>
              <Input type="date" value={lastPeriod ?? ""} onChange={(e) => setLastPeriod(e.target.value || null)} />
            </div>
            <div>
              <Label>Typical cycle length (days)</Label>
              <Input type="number" min={20} max={45} value={cycleLength} onChange={(e) => setCycleLength(Number(e.target.value) || 28)} />
            </div>
            <div className="flex items-end">
              <p className="text-xs text-muted-foreground">Pulled from your Health Hub period log — adjust here to explore.</p>
            </div>
          </div>

          {window && chance ? (
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Ovulation</p>
                <p className="font-serif italic text-2xl mt-1">{fmt(window.ovulation)}</p>
              </div>
              <div className="rounded-2xl border border-border p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Fertile window</p>
                <p className="font-serif italic text-2xl mt-1">{fmt(window.start)} – {fmt(window.end)}</p>
              </div>
              <div className="rounded-2xl border border-border p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Chance today</p>
                <p className="font-serif italic text-2xl mt-1">{chance.label} · ~{chance.pct}%</p>
                <Progress value={chance.pct * 3} className="mt-2 h-1.5" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Add your last period date to see ovulation, fertile window and today's chance of conception.</p>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                <div><Label>BBT (°C)</Label><Input type="number" step="0.01" min="34" max="40" value={bbt} onChange={(e) => setBbt(e.target.value)} placeholder="36.50" /></div>
              </div>
              <div>
                <Label>Cervical mucus</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {MUCUS_OPTIONS.map((m) => (
                    <Badge key={m} variant={mucus === m ? "default" : "outline"} className="cursor-pointer capitalize" onClick={() => setMucus(mucus === m ? "" : m)}>{m}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label>Ovulation test</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {OV_TEST_OPTIONS.map((o) => (
                    <Badge key={o} variant={ovTest === o ? "default" : "outline"} className="cursor-pointer" onClick={() => setOvTest(o)}>{o}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                <Label htmlFor="intercourse" className="cursor-pointer">Intercourse logged</Label>
                <Switch id="intercourse" checked={intercourse} onCheckedChange={setIntercourse} />
              </div>
              <div><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} /></div>
              <Button onClick={saveLog} disabled={saving} className="w-full rounded-full">{saving ? "Saving…" : "Save today's fertility log"}</Button>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">BBT chart (last {bbtPoints.length} readings)</p>
              {bbtPoints.length >= 2 ? (
                <BbtChart points={bbtPoints.map((p) => ({ d: p.log_date, v: Number(p.bbt_celsius) }))} />
              ) : (
                <p className="text-sm text-muted-foreground">Log your temperature each morning before getting up — a sustained rise of 0.3–0.5 °C suggests ovulation happened.</p>
              )}
              <p className="text-sm font-medium pt-2">Cycle history</p>
              <div className="space-y-1 max-h-56 overflow-auto pr-1">
                {rows.length === 0 && <p className="text-sm text-muted-foreground">No fertility logs yet.</p>}
                {rows.map((r) => (
                  <div key={r.log_date} className="flex items-center justify-between text-sm border-b border-border/60 py-1">
                    <span className="text-muted-foreground">{fmt(r.log_date)}</span>
                    <span className="flex items-center gap-2">
                      {r.bbt_celsius != null && <span>{r.bbt_celsius}°C</span>}
                      {r.cervical_mucus && <Badge variant="outline" className="capitalize">{r.cervical_mucus}</Badge>}
                      {r.ovulation_test === "positive" && <Badge>LH+</Badge>}
                      {r.intercourse && <span aria-label="intercourse logged">💞</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif italic text-2xl">Pre-conception health checklist</CardTitle>
          <p className="text-sm text-muted-foreground">{doneCount} of {PRECONCEPTION_ITEMS.length} complete</p>
          <Progress value={(doneCount / PRECONCEPTION_ITEMS.length) * 100} className="h-1.5 mt-2" />
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-6">
          {groups.map((g) => (
            <div key={g} className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{g}</p>
              {PRECONCEPTION_ITEMS.filter((i) => i.group === g).map((i) => (
                <label key={i.key} className="flex items-start gap-3 text-sm cursor-pointer">
                  <Checkbox checked={!!checked[i.key]} onCheckedChange={(v) => toggleItem(i.key, v === true)} className="mt-0.5" />
                  <span className={checked[i.key] ? "line-through text-muted-foreground" : ""}>{i.label}</span>
                </label>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-serif italic text-2xl">Learn</CardTitle></CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            {LEARN_PRECONCEPTION.map((l) => (
              <AccordionItem key={l.title} value={l.title}>
                <AccordionTrigger className="text-left">{l.title}</AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{l.body}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

function BbtChart({ points }: { points: { d: string; v: number }[] }) {
  const w = 320, h = 120, pad = 8;
  const vals = points.map((p) => p.v);
  const min = Math.min(...vals) - 0.1;
  const max = Math.max(...vals) + 0.1;
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1);
  const y = (v: number) => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full rounded-xl border border-border bg-card" role="img" aria-label="Basal body temperature chart">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
      {points.map((p, i) => <circle key={p.d} cx={x(i)} cy={y(p.v)} r="2" className="fill-primary" />)}
    </svg>
  );
}