import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { TestTube, Baby, CalendarDays } from "lucide-react";
import { dueDateFromLmp, dueDateFromConception, gestationalAge, todayISO, addDays } from "@/lib/pregnancy";
import type { PregnancyProfile, Stage } from "@/hooks/use-pregnancy-profile";

const STAGES: { key: Stage; label: string; hint: string }[] = [
  { key: "planning", label: "Planning", hint: "Learning and preparing" },
  { key: "trying", label: "Trying to conceive", hint: "Tracking fertility" },
  { key: "pregnant", label: "Pregnant", hint: "Week-by-week journey" },
  { key: "not_pregnant", label: "Test was negative", hint: "Back to period tracking" },
  { key: "postpartum", label: "Postpartum", hint: "Baby is here" },
];

export function StageSetup({
  profile, save,
}: { profile: PregnancyProfile; save: (p: Partial<PregnancyProfile>) => Promise<PregnancyProfile> }) {
  const [lmp, setLmp] = useState(profile.lmp_date ?? "");
  const [conception, setConception] = useState(profile.conception_date ?? "");
  const [testDate, setTestDate] = useState(profile.test_date ?? todayISO());
  const [nextAppt, setNextAppt] = useState(profile.next_appointment ?? "");
  const [busy, setBusy] = useState(false);

  const derivedDue = conception ? dueDateFromConception(conception) : lmp ? dueDateFromLmp(lmp) : null;
  const ga = lmp ? gestationalAge(lmp) : null;

  async function setStage(stage: Stage, extra: Partial<PregnancyProfile> = {}) {
    setBusy(true);
    try {
      await save({ stage, ...extra });
      toast.success("Journey updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally { setBusy(false); }
  }

  async function recordPositive() {
    if (!lmp && !conception) { toast.error("Add your last period or conception date first."); return; }
    await setStage("pregnant", {
      lmp_date: lmp || null,
      conception_date: conception || null,
      due_date: derivedDue,
      test_result: "positive",
      test_date: testDate,
      next_appointment: nextAppt || (lmp ? addDays(lmp, 56) : null),
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif italic text-2xl flex items-center gap-2"><TestTube className="h-5 w-5" /> Where are you right now?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <Badge
                key={s.key}
                variant={profile.stage === s.key ? "default" : "outline"}
                className="cursor-pointer px-3 py-1.5"
                onClick={() => setStage(s.key)}
              >
                {s.label}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{STAGES.find((s) => s.key === profile.stage)?.hint}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif italic text-2xl">Missed a period? Have you taken a pregnancy test?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid sm:grid-cols-3 gap-4">
            <div><Label>Last period started (LMP)</Label><Input type="date" value={lmp} onChange={(e) => setLmp(e.target.value)} /></div>
            <div><Label>Conception date (if known)</Label><Input type="date" value={conception} onChange={(e) => setConception(e.target.value)} /></div>
            <div><Label>Test taken on</Label><Input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} /></div>
          </div>

          {derivedDue && (
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Weeks pregnant</p>
                <p className="font-serif italic text-2xl mt-1">{ga ? `${ga.weeks}w ${ga.days}d` : "—"}</p>
              </div>
              <div className="rounded-2xl border border-border p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Estimated due date</p>
                <p className="font-serif italic text-2xl mt-1">{new Date(derivedDue).toLocaleDateString()}</p>
              </div>
              <div className="rounded-2xl border border-border p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Suggested first visit</p>
                <p className="font-serif italic text-2xl mt-1">{lmp ? new Date(addDays(lmp, 56)).toLocaleDateString() : "—"}</p>
              </div>
            </div>
          )}

          <div>
            <Label className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Next doctor's visit</Label>
            <Input type="date" value={nextAppt} onChange={(e) => setNextAppt(e.target.value)} className="max-w-xs" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={recordPositive} disabled={busy} className="rounded-full flex-1">
              <Baby className="h-4 w-4 mr-2" /> Test was positive — start Pregnancy Mode
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              className="rounded-full flex-1"
              onClick={() => setStage("not_pregnant", { test_result: "negative", test_date: testDate })}
            >
              Test was negative — keep tracking periods
            </Button>
          </div>

          {profile.test_result === "negative" && (
            <Alert>
              <AlertTitle>Period tracking continues</AlertTitle>
              <AlertDescription>
                Your cycle log is untouched. Head back to the <Link to="/health" className="underline">Health Hub</Link> for predictions,
                or keep charting BBT in Planning. A negative test taken very early can turn positive a few days later — retest if your period still hasn't arrived.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}