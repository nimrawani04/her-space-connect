import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { todayISO } from "@/lib/pregnancy";

type HealthRow = {
  log_date: string; weight_kg: number | null; bp_systolic: number | null; bp_diastolic: number | null;
  blood_sugar: number | null; water_glasses: number | null; sleep_hours: number | null;
  mood: string | null; exercise: string | null; notes: string | null;
};
type Appt = { id: string; title: string; appt_date: string; appt_time: string | null; kind: string; notes: string | null; done: boolean };
type Record_ = { id: string; record_type: string; title: string; record_date: string; summary: string | null };

const MOODS = ["great", "good", "okay", "low", "anxious", "exhausted"];
const KINDS = ["checkup", "ultrasound", "lab", "medication", "class"];

export function HealthTracking() {
  const [date, setDate] = useState(todayISO());
  const [form, setForm] = useState<Partial<HealthRow>>({});
  const [rows, setRows] = useState<HealthRow[]>([]);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [records, setRecords] = useState<Record_[]>([]);
  const [busy, setBusy] = useState(false);

  const [aTitle, setATitle] = useState("");
  const [aDate, setADate] = useState(todayISO());
  const [aTime, setATime] = useState("");
  const [aKind, setAKind] = useState("checkup");

  const [rTitle, setRTitle] = useState("");
  const [rType, setRType] = useState("lab");
  const [rDate, setRDate] = useState(todayISO());
  const [rSummary, setRSummary] = useState("");

  async function load() {
    const [{ data: h }, { data: a }, { data: r }] = await Promise.all([
      supabase.from("pregnancy_health_logs").select("*").order("log_date", { ascending: false }).limit(60),
      supabase.from("pregnancy_appointments").select("*").order("appt_date", { ascending: true }),
      supabase.from("pregnancy_records").select("*").order("record_date", { ascending: false }).limit(30),
    ]);
    setRows((h as unknown as HealthRow[]) ?? []);
    setAppts((a as unknown as Appt[]) ?? []);
    setRecords((r as unknown as Record_[]) ?? []);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    setForm(rows.find((x) => x.log_date === date) ?? {});
  }, [date, rows]);

  function set<K extends keyof HealthRow>(k: K, v: HealthRow[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  const num = (v: string) => (v === "" ? null : Number(v));

  async function saveLog() {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Sign in required"); setBusy(false); return; }
    const { error } = await supabase.from("pregnancy_health_logs").upsert({
      user_id: u.user.id, log_date: date,
      weight_kg: form.weight_kg ?? null, bp_systolic: form.bp_systolic ?? null, bp_diastolic: form.bp_diastolic ?? null,
      blood_sugar: form.blood_sugar ?? null, water_glasses: form.water_glasses ?? null, sleep_hours: form.sleep_hours ?? null,
      mood: form.mood ?? null, exercise: form.exercise ?? null, notes: form.notes ?? null,
    }, { onConflict: "user_id,log_date" });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved.");
    load();
  }

  async function addAppt() {
    if (!aTitle.trim()) { toast.error("Give the appointment a name."); return; }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("pregnancy_appointments").insert({
      user_id: u.user.id, title: aTitle.trim(), appt_date: aDate, appt_time: aTime || null, kind: aKind,
    });
    if (error) { toast.error(error.message); return; }
    setATitle(""); setATime(""); load();
  }

  async function addRecord() {
    if (!rTitle.trim()) { toast.error("Give the record a title."); return; }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("pregnancy_records").insert({
      user_id: u.user.id, title: rTitle.trim(), record_type: rType, record_date: rDate, summary: rSummary || null,
    });
    if (error) { toast.error(error.message); return; }
    setRTitle(""); setRSummary(""); load();
  }

  const weights = rows.filter((r) => r.weight_kg != null).slice(0, 12).reverse();
  const upcoming = appts.filter((a) => !a.done && a.appt_date >= todayISO());

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="font-serif italic text-2xl">Daily health tracking</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><Label>Weight (kg)</Label><Input type="number" step="0.1" value={form.weight_kg ?? ""} onChange={(e) => set("weight_kg", num(e.target.value))} /></div>
            <div><Label>Blood sugar (mg/dL)</Label><Input type="number" step="0.1" value={form.blood_sugar ?? ""} onChange={(e) => set("blood_sugar", num(e.target.value))} /></div>
            <div><Label>BP systolic</Label><Input type="number" value={form.bp_systolic ?? ""} onChange={(e) => set("bp_systolic", num(e.target.value))} /></div>
            <div><Label>BP diastolic</Label><Input type="number" value={form.bp_diastolic ?? ""} onChange={(e) => set("bp_diastolic", num(e.target.value))} /></div>
            <div><Label>Water (glasses)</Label><Input type="number" value={form.water_glasses ?? ""} onChange={(e) => set("water_glasses", num(e.target.value))} /></div>
            <div><Label>Sleep (hours)</Label><Input type="number" step="0.5" value={form.sleep_hours ?? ""} onChange={(e) => set("sleep_hours", num(e.target.value))} /></div>
            <div><Label>Exercise</Label><Input value={form.exercise ?? ""} onChange={(e) => set("exercise", e.target.value)} placeholder="walk 20 min" /></div>
          </div>
          <div>
            <Label>Mood</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {MOODS.map((m) => (
                <Badge key={m} variant={form.mood === m ? "default" : "outline"} className="cursor-pointer capitalize" onClick={() => set("mood", form.mood === m ? null : m)}>{m}</Badge>
              ))}
            </div>
          </div>
          <div><Label>Notes</Label><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} maxLength={1000} /></div>
          <Button className="rounded-full" onClick={saveLog} disabled={busy}>{busy ? "Saving…" : "Save entry"}</Button>

          {(form.bp_systolic ?? 0) >= 140 || (form.bp_diastolic ?? 0) >= 90 ? (
            <p className="text-sm text-destructive">That blood pressure reading is high — please contact your clinician today.</p>
          ) : null}

          {weights.length >= 2 && (
            <div>
              <p className="text-sm font-medium mb-2">Weight trend</p>
              <div className="flex items-end gap-1 h-24">
                {weights.map((w) => {
                  const vals = weights.map((x) => x.weight_kg!);
                  const min = Math.min(...vals) - 1, max = Math.max(...vals) + 1;
                  const h = ((w.weight_kg! - min) / (max - min || 1)) * 100;
                  return <div key={w.log_date} className="flex-1 bg-primary/70 rounded-t" style={{ height: `${Math.max(6, h)}%` }} title={`${w.log_date}: ${w.weight_kg} kg`} />;
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-serif italic text-2xl">Appointments & medication reminders</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-4 gap-3">
            <Input placeholder="e.g. Anomaly scan" value={aTitle} onChange={(e) => setATitle(e.target.value)} />
            <Input type="date" value={aDate} onChange={(e) => setADate(e.target.value)} />
            <Input type="time" value={aTime} onChange={(e) => setATime(e.target.value)} />
            <div className="flex gap-2">
              <select className="flex-1 rounded-md border border-input bg-background px-2 text-sm" value={aKind} onChange={(e) => setAKind(e.target.value)}>
                {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <Button className="rounded-full" onClick={addAppt}>Add</Button>
            </div>
          </div>
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>}
          <div className="space-y-2">
            {appts.map((a) => (
              <div key={a.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm ${a.done ? "opacity-60" : ""}`}>
                <span className="flex items-center gap-2">
                  <Badge variant="outline">{a.kind}</Badge>
                  <span className={a.done ? "line-through" : ""}>{a.title}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-muted-foreground">{new Date(a.appt_date).toLocaleDateString()}{a.appt_time ? ` · ${a.appt_time}` : ""}</span>
                  <Button size="sm" variant="ghost" onClick={async () => { await supabase.from("pregnancy_appointments").update({ done: !a.done }).eq("id", a.id); load(); }}>
                    {a.done ? "Undo" : "Done"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={async () => { await supabase.from("pregnancy_appointments").delete().eq("id", a.id); load(); }}>Delete</Button>
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-serif italic text-2xl">Lab reports & ultrasound records</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-4 gap-3">
            <Input placeholder="Title (e.g. Hb 11.2)" value={rTitle} onChange={(e) => setRTitle(e.target.value)} />
            <select className="rounded-md border border-input bg-background px-2 text-sm h-10" value={rType} onChange={(e) => setRType(e.target.value)}>
              <option value="lab">lab report</option>
              <option value="ultrasound">ultrasound</option>
              <option value="other">other</option>
            </select>
            <Input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} />
            <Button className="rounded-full" onClick={addRecord}>Save record</Button>
          </div>
          <Textarea rows={2} placeholder="Summary / findings" value={rSummary} onChange={(e) => setRSummary(e.target.value)} maxLength={2000} />
          <div className="space-y-2">
            {records.length === 0 && <p className="text-sm text-muted-foreground">No records saved yet.</p>}
            {records.map((r) => (
              <div key={r.id} className="rounded-xl border border-border px-3 py-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{r.title}</span>
                  <span className="text-muted-foreground">{new Date(r.record_date).toLocaleDateString()}</span>
                </div>
                <Badge variant="outline" className="mt-1">{r.record_type}</Badge>
                {r.summary && <p className="mt-1 text-muted-foreground">{r.summary}</p>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}