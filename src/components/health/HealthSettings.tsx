import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Bell, Download, ShieldCheck, Trash2 } from "lucide-react";

type Prefs = {
  notify_period: boolean; notify_ovulation: boolean; notify_hydration: boolean; notify_sleep: boolean;
  notify_logging: boolean; notify_medication: boolean; notify_doctor: boolean;
  period_lead_days: number; ai_analysis_enabled: boolean;
};
const DEFAULTS: Prefs = {
  notify_period: true, notify_ovulation: true, notify_hydration: false, notify_sleep: false,
  notify_logging: true, notify_medication: false, notify_doctor: false,
  period_lead_days: 2, ai_analysis_enabled: true,
};

export function HealthSettings() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) { setPermission("unsupported"); return; }
    setPermission(Notification.permission);
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("notification_prefs").select("*").eq("user_id", u.user.id).maybeSingle();
      if (data) setPrefs({ ...DEFAULTS, ...data });
    })();
  }, []);

  async function save(next: Partial<Prefs>) {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("notification_prefs").upsert({ user_id: u.user.id, ...merged });
  }

  async function requestPermission() {
    if (permission === "unsupported") return;
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === "granted") new Notification("HerSpace reminders on", { body: "We'll gently nudge you when relevant." });
  }

  async function exportData() {
    setLoading(true);
    const [c, w, j] = await Promise.all([
      supabase.from("cycle_entries").select("*"),
      supabase.from("wellness_logs").select("*"),
      supabase.from("journal_entries").select("*"),
    ]);
    const blob = new Blob([JSON.stringify({
      exported_at: new Date().toISOString(),
      cycle_entries: c.data, wellness_logs: w.data, journal_entries: j.data,
    }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `herspace-export-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
    setLoading(false);
    toast.success("Data exported");
  }

  async function deleteAll() {
    if (!confirm("Delete ALL your cycle, wellness, and journal data? This cannot be undone.")) return;
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await Promise.all([
      supabase.from("cycle_entries").delete().eq("user_id", u.user.id),
      supabase.from("wellness_logs").delete().eq("user_id", u.user.id),
      supabase.from("journal_entries").delete().eq("user_id", u.user.id),
    ]);
    setLoading(false);
    toast.success("All health data deleted");
  }

  const toggles: { key: keyof Prefs; label: string; desc: string }[] = [
    { key: "notify_period", label: "Upcoming period", desc: "Heads-up before your expected start" },
    { key: "notify_ovulation", label: "Ovulation window", desc: "On estimated ovulation day" },
    { key: "notify_logging", label: "Daily logging", desc: "Gentle reminder to log mood + symptoms" },
    { key: "notify_hydration", label: "Hydration", desc: "Mid-day water nudge" },
    { key: "notify_sleep", label: "Sleep", desc: "Wind-down reminder in the evening" },
    { key: "notify_medication", label: "Medication", desc: "Custom medication reminders" },
    { key: "notify_doctor", label: "Doctor follow-ups", desc: "Track upcoming appointments" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="font-serif italic text-2xl flex items-center gap-2"><Bell className="h-5 w-5" /> Smart notifications</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {permission !== "granted" && permission !== "unsupported" && (
            <Alert><AlertTitle>Enable browser notifications</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-3 flex-wrap">
                <span>Reminders need permission from your browser.</span>
                <Button size="sm" onClick={requestPermission}>Enable</Button>
              </AlertDescription>
            </Alert>
          )}
          {permission === "unsupported" && (
            <Alert><AlertDescription>Your browser does not support web notifications. Reminders will show in-app instead.</AlertDescription></Alert>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            {toggles.map((t) => (
              <div key={t.key} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium text-sm">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
                <Switch checked={!!prefs[t.key]} onCheckedChange={(v) => save({ [t.key]: v } as Partial<Prefs>)} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-sm">Period reminder — days ahead:</Label>
            <Input type="number" min={0} max={7} value={prefs.period_lead_days} onChange={(e) => save({ period_lead_days: Number(e.target.value) })} className="w-20" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-serif italic text-2xl flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Privacy & data</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            All of your cycle, wellness, and journal data is private to you, encrypted in transit and at rest, and never sold or shared. You're in full control.
          </p>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div>
              <p className="font-medium text-sm">AI analysis</p>
              <p className="text-xs text-muted-foreground">When off, AI prediction and pattern detection are disabled.</p>
            </div>
            <Switch checked={prefs.ai_analysis_enabled} onCheckedChange={(v) => save({ ai_analysis_enabled: v })} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportData} disabled={loading} variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export my data (JSON)</Button>
            <Button onClick={deleteAll} disabled={loading} variant="destructive" className="gap-2"><Trash2 className="h-4 w-4" /> Delete all health data</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}