import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Bell, Download, ShieldCheck, Trash2, Sparkles } from "lucide-react";
import { useLifeStagePreferences } from "@/hooks/use-life-stage-preferences";

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
  const { preferences: lifeStages, setPreference: setLifeStagePreference } = useLifeStagePreferences();
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
      if (data) {
        const cleaned = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null));
        setPrefs({ ...DEFAULTS, ...(cleaned as Partial<Prefs>) });
      }
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
      {/* Life Stage Hub Customization */}
      <Card className="rounded-3xl border border-primary/25 bg-card/90 shadow-xs overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] uppercase tracking-wider text-primary font-semibold">
              Personalized Experience
            </span>
          </div>
          <CardTitle className="font-serif italic text-2xl flex items-center gap-2 text-foreground">
            <Sparkles className="h-5 w-5 text-primary" /> Life Stages &amp; Specialized Hubs
          </CardTitle>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            HerSpace adapts to your current stage of life. Turn on specialized hubs only when you need them — keep them toggled off for a clean, focused period and cycle tracking view.
          </p>
        </CardHeader>
        <CardContent className="space-y-3.5 pt-1">
          {/* 1. Teen & First Period */}
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 p-4 transition-colors hover:border-primary/40 bg-secondary/20">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base">🌸</span>
                <p className="font-medium text-sm text-foreground">Teen &amp; First Period</p>
                {lifeStages.teen_period && (
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">Active in Health</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                First period education, puberty body changes, cycle basics, and private answers for young teens.
              </p>
            </div>
            <Switch
              checked={lifeStages.teen_period}
              onCheckedChange={(checked) => {
                setLifeStagePreference("teen_period", checked);
                toast.success(checked ? "Teen & First Period hub enabled in Health Hub" : "Teen & First Period hub hidden");
              }}
              className="mt-1"
            />
          </div>

          {/* 2. Perimenopause & Menopause */}
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 p-4 transition-colors hover:border-primary/40 bg-secondary/20">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base">🌿</span>
                <p className="font-medium text-sm text-foreground">Perimenopause &amp; Menopause</p>
                {lifeStages.perimenopause && (
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">Active in Health</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Erratic cycle rhythms, hot flashes, brain fog, sleep changes, and midlife hormonal transition support.
              </p>
            </div>
            <Switch
              checked={lifeStages.perimenopause}
              onCheckedChange={(checked) => {
                setLifeStagePreference("perimenopause", checked);
                toast.success(checked ? "Perimenopause hub enabled in Health Hub" : "Perimenopause hub hidden");
              }}
              className="mt-1"
            />
          </div>

          {/* 3. Pregnancy & Postpartum */}
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 p-4 transition-colors hover:border-primary/40 bg-secondary/20">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base">🍼</span>
                <p className="font-medium text-sm text-foreground">Pregnancy &amp; Postpartum</p>
                {lifeStages.pregnancy && (
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">Active in Navigation</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Conception planning, weekly fetal development, trimester milestones, and maternal health tracker.
              </p>
            </div>
            <Switch
              checked={lifeStages.pregnancy}
              onCheckedChange={(checked) => {
                setLifeStagePreference("pregnancy", checked);
                toast.success(checked ? "Pregnancy section enabled in navigation" : "Pregnancy section hidden");
              }}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>
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