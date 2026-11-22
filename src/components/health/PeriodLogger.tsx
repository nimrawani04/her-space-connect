import { useEffect, useState } from "react";
import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  getDay,
  isAfter,
  startOfMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FLOW_OPTIONS, BLOOD_COLORS, CLOTTING_OPTIONS, PERIOD_SYMPTOMS, summarizeCycles } from "@/lib/cycle-stats";

type Severity = 1 | 2 | 3;

function toISO(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function fromISO(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Group an array of ISO date strings into distinct period clusters.
 * Any dates with a gap of <= 2 days (adjacent days or 1 missed day) are grouped into one period.
 * Dates separated by more than 2 days are treated as separate periods.
 */
export function groupDaysIntoPeriods(
  days: string[],
  maxGapDays = 2,
): { start: string; end: string; days: string[] }[] {
  if (!days.length) return [];
  const sorted = Array.from(new Set(days)).sort();
  const clusters: { start: string; end: string; days: string[] }[] = [];

  let currentCluster: string[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = fromISO(sorted[i - 1]);
    const curr = fromISO(sorted[i]);
    const diff = differenceInCalendarDays(curr, prev);
    if (diff <= maxGapDays) {
      currentCluster.push(sorted[i]);
    } else {
      clusters.push({
        start: currentCluster[0],
        end: currentCluster[currentCluster.length - 1],
        days: currentCluster,
      });
      currentCluster = [sorted[i]];
    }
  }
  if (currentCluster.length) {
    clusters.push({
      start: currentCluster[0],
      end: currentCluster[currentCluster.length - 1],
      days: currentCluster,
    });
  }
  return clusters;
}

export function PeriodLogger() {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [rangeAnchor, setRangeAnchor] = useState<Date | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [flowIntensity, setFlowIntensity] = useState<string>("");
  const [bloodColor, setBloodColor] = useState("");
  const [clotting, setClotting] = useState("");
  const [pain, setPain] = useState<number>(0);
  const [cramp, setCramp] = useState<number>(0);
  const [symptoms, setSymptoms] = useState<Record<string, Severity>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase
      .from("cycle_entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .limit(365);
    setHistory(data ?? []);
  }
  useEffect(() => { load(); }, []);

  function toggleSymptom(s: string) {
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

  /**
   * Date selection handler:
   * 1. Clicking an already selected day deselects it and clears anchor if it was the anchor.
   * 2. First click sets the range anchor and marks the day.
   * 3. Second click within 12 days (e.g. 3-4 days in between) automatically fills the entire date range!
   * 4. Clicks >12 days apart start a new independent period range.
   */
  function togglePeriodDay(day: Date) {
    const iso = toISO(day);

    if (selectedDays.includes(iso)) {
      setSelectedDays((current) => current.filter((date) => date !== iso));
      if (rangeAnchor && toISO(rangeAnchor) === iso) {
        setRangeAnchor(null);
      }
      return;
    }

    if (!rangeAnchor) {
      setSelectedDays((current) => [...current, iso].sort());
      setRangeAnchor(day);
      return;
    }

    const diff = differenceInCalendarDays(day, rangeAnchor);
    const absDiff = Math.abs(diff);

    if (absDiff >= 1 && absDiff <= 12) {
      const minD = diff < 0 ? day : rangeAnchor;
      const maxD = diff < 0 ? rangeAnchor : day;
      const rangeDays: string[] = [];
      for (let cur = new Date(minD); cur <= maxD; cur.setDate(cur.getDate() + 1)) {
        rangeDays.push(toISO(cur));
      }
      setSelectedDays((current) => Array.from(new Set([...current, ...rangeDays])).sort());
      setRangeAnchor(null);
    } else {
      setSelectedDays((current) => Array.from(new Set([...current, iso])).sort());
      setRangeAnchor(day);
    }
  }

  function removeCluster(clusterDays: string[]) {
    const set = new Set(clusterDays);
    setSelectedDays((cur) => cur.filter((d) => !set.has(d)));
    if (rangeAnchor && set.has(toISO(rangeAnchor))) {
      setRangeAnchor(null);
    }
  }

  async function save() {
    if (!selectedDays.length) {
      toast.error("Pick at least one period day on the calendar");
      return;
    }
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error("Sign in required");
      setLoading(false);
      return;
    }

    const clusters = groupDaysIntoPeriods(selectedDays);
    if (!clusters.length) {
      toast.error("No period days selected");
      setLoading(false);
      return;
    }

    const rows = clusters.map((cluster) => ({
      user_id: u.user.id,
      entry_date: cluster.start,
      end_date: cluster.end,
      is_period_start: true,
      flow_intensity: flowIntensity || null,
      flow: flowIntensity || null,
      blood_color: bloodColor || null,
      clotting: clotting || null,
      pain_level: pain > 0 ? pain : null,
      cramp_level: cramp > 0 ? cramp : null,
      period_symptoms: Object.keys(symptoms).length ? symptoms : null,
      notes: notes || null,
    }));

    const { error } = await supabase
      .from("cycle_entries")
      .upsert(rows, { onConflict: "user_id,entry_date" });

    setLoading(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
      return;
    }

    if (clusters.length === 1) {
      toast.success("Period logged successfully.");
    } else {
      toast.success(`All ${clusters.length} periods saved successfully across months.`);
    }

    setSymptoms({});
    setNotes("");
    setBloodColor("");
    setClotting("");
    setPain(0);
    setCramp(0);
    setSelectedDays([]);
    setRangeAnchor(null);
    load();
  }

  async function deleteEntry(id: string) {
    setDeletingId(id);
    const { error } = await supabase.from("cycle_entries").delete().eq("id", id);
    setDeletingId(null);
    if (error) {
      toast.error("Could not delete period: " + error.message);
      return;
    }
    toast.success("Period log deleted.");
    load();
  }

  const stats = summarizeCycles(history);

  const loggedDays = new Set<string>();
  const loggedStarts = new Set<string>();
  history.forEach((h) => {
    if (!h.entry_date) return;
    const isPeriodEntry = h.is_period_start || h.flow_intensity;
    if (!isPeriodEntry) return;
    const start = fromISO(h.entry_date);
    const rawEnd = h.end_date ? fromISO(h.end_date) : start;
    const diff = differenceInCalendarDays(rawEnd, start);
    const end = diff < 0 || diff > 14 ? start : rawEnd;
    loggedStarts.add(h.entry_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      loggedDays.add(toISO(d));
    }
  });
  const loggedModifier = (d: Date) => loggedDays.has(toISO(d));
  const startModifier = (d: Date) => loggedStarts.has(toISO(d));

  const clusters = groupDaysIntoPeriods(selectedDays);

  const sevTone: Record<Severity, string> = {
    1: "bg-sage/20 text-sage border-sage/40",
    2: "bg-amber-100 text-amber-900 border-amber-300",
    3: "bg-rose-100 text-rose-900 border-rose-300",
  };
  const sevLabel: Record<Severity, string> = { 1: "mild", 2: "moderate", 3: "severe" };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="font-serif italic text-2xl">Log a period</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Tap a start day and an end day to auto-fill the days in between. Navigate months to log multiple months together and save all at once.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border border-border bg-sand/20 p-2 sm:p-3 space-y-2.5">
            <PeriodRangeCalendar
              visibleMonth={visibleMonth}
              setVisibleMonth={setVisibleMonth}
              selectedDays={selectedDays}
              rangeAnchor={rangeAnchor}
              onPick={togglePeriodDay}
              isLogged={loggedModifier}
              isLoggedStart={startModifier}
            />

            {/* Range anchor helper banner */}
            {rangeAnchor && (
              <div className="flex items-center justify-between gap-2 p-2 px-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-200">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>
                    Start date: <strong>{format(rangeAnchor, "MMM d")}</strong>. Tap an end date (e.g. 3–4 days later) to auto-fill the range.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setRangeAnchor(null)}
                  className="text-muted-foreground hover:text-foreground underline underline-offset-2 shrink-0 font-medium cursor-pointer"
                >
                  cancel range
                </button>
              </div>
            )}

            {/* Pending clusters list across months */}
            {clusters.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-earth">
                    {clusters.length === 1
                      ? `1 period selected (${selectedDays.length} day${selectedDays.length > 1 ? "s" : ""}):`
                      : `${clusters.length} periods selected across months (${selectedDays.length} days total):`}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setSelectedDays([]); setRangeAnchor(null); }}
                    className="text-muted-foreground hover:text-earth underline underline-offset-2 cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {clusters.map((c, i) => (
                    <span
                      key={`${c.start}-${c.end}-${i}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-rose-100 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800 font-medium"
                    >
                      <span>
                        {format(fromISO(c.start), "MMM d")}
                        {c.start !== c.end ? ` → ${format(fromISO(c.end), "MMM d")}` : ""}
                        <span className="text-[11px] opacity-75 ml-1">({c.days.length}d)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCluster(c.days)}
                        className="hover:text-rose-600 dark:hover:text-rose-100 font-bold ml-0.5 cursor-pointer"
                        title="Remove this period from selection"
                        aria-label={`Remove period ${c.start}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-200 dark:bg-rose-800 border border-rose-300 dark:border-rose-700" /> Previously logged
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Selected
                </span>
              </div>
            </div>
          </div>

          <div>
            <Label>Flow intensity <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {FLOW_OPTIONS.map((f) => (
                <button key={f} type="button" onClick={() => setFlowIntensity(f)}
                  className={`px-3 py-1.5 rounded-full text-xs border capitalize cursor-pointer transition-colors ${flowIntensity === f ? "bg-earth text-earth-foreground border-earth" : "bg-background border-border hover:border-earth/40"}`}>
                  {f.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Blood color <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {BLOOD_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setBloodColor(c)}
                    className={`px-2.5 py-1 rounded-full text-xs border capitalize cursor-pointer transition-colors ${bloodColor === c ? "bg-earth text-earth-foreground border-earth" : "bg-background border-border hover:border-earth/40"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Clotting <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {CLOTTING_OPTIONS.map((c) => (
                  <button key={c} type="button" onClick={() => setClotting(c)}
                    className={`px-2.5 py-1 rounded-full text-xs border capitalize cursor-pointer transition-colors ${clotting === c ? "bg-earth text-earth-foreground border-earth" : "bg-background border-border hover:border-earth/40"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label>Pain level — <span className="text-earth font-medium">{pain}/10</span> <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
            <Slider value={[pain]} min={0} max={10} step={1} onValueChange={(v) => setPain(v[0])} className="mt-2" />
          </div>

          <div>
            <Label>
              Cramp level — <span className="text-earth font-medium">{cramp}/10</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {cramp === 0 ? "none" : cramp <= 3 ? "mild" : cramp <= 6 ? "moderate" : cramp <= 8 ? "strong" : "severe"}
              </span>
              <span className="ml-2 text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Slider value={[cramp]} min={0} max={10} step={1} onValueChange={(v) => setCramp(v[0])} className="mt-2" />
            <p className="text-[11px] text-muted-foreground mt-1">Rate cramps separately from overall pain — sharper signal for phase correlations.</p>
          </div>

          <div>
            <Label>Symptoms <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {PERIOD_SYMPTOMS.map((s) => {
                const sev = symptoms[s];
                return (
                  <button key={s} type="button" onClick={() => toggleSymptom(s)}
                    className={`px-2.5 py-1 rounded-full text-xs border capitalize cursor-pointer transition-colors ${sev ? sevTone[sev] : "bg-sand/40 text-earth border-transparent hover:border-earth/30"}`}>
                    {s.replace("_", " ")}{sev && <span className="ml-1 opacity-70">· {sevLabel[sev]}</span>}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">Tap once for mild, again for moderate, again for severe, again to clear.</p>
          </div>

          <div>
            <Label>Notes <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes on your cycle, energy, medication..." />
          </div>

          <Button
            onClick={save}
            disabled={loading || selectedDays.length === 0}
            className="w-full rounded-full bg-earth text-earth-foreground hover:brightness-110 cursor-pointer h-11 text-sm font-medium shadow-sm transition-all"
          >
            {loading
              ? "Saving…"
              : clusters.length > 1
                ? `Save all ${clusters.length} periods (${selectedDays.length} days)`
                : selectedDays.length > 0
                  ? `Save period (${selectedDays.length} day${selectedDays.length > 1 ? "s" : ""})`
                  : "Pick dates on calendar"}
          </Button>
        </CardContent>
      </Card>

      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader><CardTitle className="font-serif italic">Your averages</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Cycles tracked" value={String(stats.cycleCount)} />
            <Row label="Avg cycle" value={stats.avgCycle ? `${stats.avgCycle} days` : "—"} />
            <Row label="Avg period" value={stats.avgPeriod ? `${stats.avgPeriod} days` : "—"} />
            <Row label="Avg flow" value={stats.flow?.label ?? "—"} />
            <Row label="Regularity" value={stats.regularity?.label ?? "—"} />
            <Row label="Longest" value={stats.longest ? `${stats.longest} d` : "—"} />
            <Row label="Shortest" value={stats.shortest ? `${stats.shortest} d` : "—"} />
            <Row label="Days since last" value={stats.daysSinceLast != null ? `${stats.daysSinceLast} d` : "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-serif italic">Recent periods</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[360px] overflow-auto text-sm">
            {history.filter((h) => h.flow_intensity || h.is_period_start).slice(0, 24).map((h) => {
              const start = fromISO(h.entry_date);
              const end = h.end_date ? fromISO(h.end_date) : start;
              const duration = differenceInCalendarDays(end, start) + 1;
              return (
                <div key={h.id} className="rounded-lg border border-border p-2.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">
                      {format(start, "MMM d, yyyy")}
                      {h.end_date && h.end_date !== h.entry_date ? ` → ${format(end, "MMM d, yyyy")}` : ""}
                      <span className="text-xs text-muted-foreground ml-1.5 font-normal">
                        ({duration} day{duration > 1 ? "s" : ""})
                      </span>
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {h.flow_intensity && (
                        <Badge variant="outline" className="capitalize text-[11px]">
                          {(h.flow_intensity as string).replace("_", " ")}
                        </Badge>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={deletingId === h.id}
                        onClick={() => deleteEntry(h.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full cursor-pointer"
                        aria-label={`Delete period starting ${h.entry_date}`}
                        title="Delete this period log"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {(h.pain_level != null || h.cramp_level != null) && (
                    <p className="text-muted-foreground text-xs">
                      {h.pain_level != null && <>Pain: {h.pain_level}/10</>}
                      {h.pain_level != null && h.cramp_level != null && " · "}
                      {h.cramp_level != null && <>Cramps: {h.cramp_level}/10</>}
                    </p>
                  )}
                </div>
              );
            })}
            {!history.filter((h) => h.flow_intensity || h.is_period_start).length && (
              <p className="text-muted-foreground text-xs">No periods logged yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PeriodRangeCalendar({
  visibleMonth,
  setVisibleMonth,
  selectedDays,
  rangeAnchor,
  onPick,
  isLogged,
  isLoggedStart,
}: {
  visibleMonth: Date;
  setVisibleMonth: (date: Date) => void;
  selectedDays: string[];
  rangeAnchor: Date | null;
  onPick: (day: Date) => void;
  isLogged: (day: Date) => boolean;
  isLoggedStart: (day: Date) => boolean;
}) {
  const maxDay = addMonths(new Date(), 2);
  maxDay.setHours(23, 59, 59, 999);

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Previous month"
            onClick={() => setVisibleMonth(startOfMonth(addMonths(visibleMonth, -1)))}
            className="h-8 w-8 shrink-0 rounded-full cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-semibold text-earth min-w-[130px] text-center">
            {format(visibleMonth, "MMMM yyyy")}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Next month"
            onClick={() => setVisibleMonth(startOfMonth(addMonths(visibleMonth, 1)))}
            className="h-8 w-8 shrink-0 rounded-full cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setVisibleMonth(startOfMonth(new Date()))}
          className="h-7 px-2.5 text-xs rounded-full cursor-pointer"
        >
          Today
        </Button>
      </div>

      <div className="w-full">
        <MonthCalendar
          month={visibleMonth}
          maxDay={maxDay}
          selectedDays={selectedDays}
          rangeAnchor={rangeAnchor}
          onPick={onPick}
          isLogged={isLogged}
          isLoggedStart={isLoggedStart}
        />
      </div>
    </div>
  );
}

function MonthCalendar({
  month,
  maxDay,
  selectedDays,
  rangeAnchor,
  onPick,
  isLogged,
  isLoggedStart,
}: {
  month: Date;
  maxDay: Date;
  selectedDays: string[];
  rangeAnchor: Date | null;
  onPick: (day: Date) => void;
  isLogged: (day: Date) => boolean;
  isLoggedStart: (day: Date) => boolean;
}) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const leadingBlanks = getDay(monthStart);
  const daysInMonth = monthEnd.getDate();
  const cells = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(monthStart.getFullYear(), monthStart.getMonth(), index + 1, 12, 0, 0)),
  ];
  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <section aria-label={format(monthStart, "MMMM yyyy")} className="w-full min-w-[268px]">
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground font-medium">
        {weekDays.map((day, index) => <div key={`${day}-${index}`} className="h-6 leading-6">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (!day) return <div key={`blank-${index}`} className="aspect-square" aria-hidden="true" />;

          const disabled = isAfter(day, maxDay);
          const dayIso = toISO(day);
          const logged = isLogged(day);
          const loggedStart = isLoggedStart(day);
          const selected = selectedDays.includes(dayIso);
          const isAnchor = rangeAnchor ? toISO(rangeAnchor) === dayIso : false;

          return (
            <button
              key={dayIso}
              type="button"
              disabled={disabled}
              aria-pressed={selected || logged}
              aria-label={`${format(day, "MMMM d, yyyy")}${logged ? " (Logged period)" : ""}${selected ? " (Selected)" : ""}`}
              onClick={() => onPick(day)}
              className={`aspect-square min-h-9 w-full text-sm transition relative rounded-lg cursor-pointer disabled:pointer-events-none disabled:opacity-35 ${
                isAnchor
                  ? "bg-rose-500 text-white font-bold ring-2 ring-rose-400 ring-offset-2 shadow-sm animate-pulse scale-105"
                  : selected
                    ? "bg-rose-500 text-white font-semibold shadow-xs"
                    : logged
                      ? "bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200 border border-rose-200 dark:border-rose-900/50"
                      : "bg-transparent text-foreground hover:bg-sand/40 dark:hover:bg-sand/10"
              } ${(selected || loggedStart) && (selected || logged) ? "font-semibold" : "font-normal"}`}
            >
              <span>{format(day, "d")}</span>
              {loggedStart && !selected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-rose-600 dark:bg-rose-400" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/50 pb-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
