import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Flame,
  Moon,
  Zap,
  Smile,
  Heart,
  Calendar,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Thermometer,
  ShieldCheck,
  Activity,
  Brain,
  Coffee,
  BedDouble,
  ChevronRight,
  RefreshCw,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

// Types
export type PerimenopauseLog = {
  id: string;
  date: string;
  hotFlashFrequency: number; // 0 to 10
  hotFlashSeverity: "none" | "mild" | "moderate" | "severe";
  sleepQuality: number; // 1 to 5
  sleepHours: number;
  nightSweats: boolean;
  energyLevel: number; // 1 to 5
  mood: string;
  brainFog: boolean;
  cycleStatus: "regular" | "irregular" | "skipping" | "amenorrhea_12m";
  cycleNotes: string;
  notes: string;
};

// Menopause Stages (STRAW + 10 Clinical Framework)
const MENOPAUSE_STAGES = [
  {
    id: "pre",
    title: "Late Reproductive",
    ageRange: "Ages ~38 - 44",
    indicator: "Subtle hormonal shifts",
    description: "Periods remain regular, but subtle changes in luteal phase length or flow may begin as progesterone gently declines.",
    symptoms: ["Subtle cycle shortening (e.g. 26 vs 28 days)", "Mild premenstrual mood sensitivity", "Baseline FSH levels normal"],
    color: "from-blue-500/15 to-indigo-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300",
  },
  {
    id: "early_peri",
    title: "Early Perimenopause",
    ageRange: "Ages ~42 - 48",
    indicator: "Cycle variation ≥ 7 days",
    description: "Persistent difference of 7 or more days between consecutive cycles. Estrogen surges and dips unpredictably.",
    symptoms: ["Unpredictable cycle lengths", "First occasional night sweats", "Early morning waking (3-4 AM)", "Mild brain fog"],
    color: "from-amber-500/15 to-orange-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300",
  },
  {
    id: "late_peri",
    title: "Late Perimenopause",
    ageRange: "Ages ~45 - 51",
    indicator: "Skipped cycles ≥ 60 days",
    description: "Marked by an interval of amenorrhea of 60 days or longer. Vasomotor symptoms (hot flashes) are often most prominent here.",
    symptoms: ["Skipped periods (2-3 months without bleeding)", "Classic hot flashes & sudden heat surges", "Vaginal dryness / tissue sensitivity", "Mood lability"],
    color: "from-rose-500/15 to-pink-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300",
  },
  {
    id: "menopause",
    title: "Menopause",
    ageRange: "Average Age 51.4",
    indicator: "12 consecutive months amenorrhea",
    description: "The clinical point in time confirmed retrospectively after 12 consecutive months without a menstrual period without other cause.",
    symptoms: ["Complete cessation of menstrual bleeding", "Permanent transition of ovarian estrogen output", "Transition into post-reproductive longevity"],
    color: "from-purple-500/15 to-violet-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300",
  },
  {
    id: "post",
    title: "Post-Menopause",
    ageRange: "Age 52+",
    indicator: "Hormonal baseline stabilized",
    description: "Hormone fluctuations settle into a stable baseline. Clinical focus shifts to cardiovascular health, bone density, and vitality.",
    symptoms: ["Vasomotor surges typically subside over time", "Focus on bone mineral density (DEXA)", "Cardiovascular lipid surveillance", "Cognitive & metabolic vibrancy"],
    color: "from-emerald-500/15 to-teal-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
  },
];

const STORAGE_KEY = "herspace_perimenopause_logs";

export function PerimenopauseHub() {
  const [logs, setLogs] = useState<PerimenopauseLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedStage, setSelectedStage] = useState("early_peri");

  // Daily Logging Form State
  const [hotFlashes, setHotFlashes] = useState(2);
  const [hotFlashSeverity, setHotFlashSeverity] = useState<"none" | "mild" | "moderate" | "severe">("mild");
  const [sleepHours, setSleepHours] = useState(6.5);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [nightSweats, setNightSweats] = useState(false);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [mood, setMood] = useState("Irritable");
  const [brainFog, setBrainFog] = useState(true);
  const [cycleStatus, setCycleStatus] = useState<"regular" | "irregular" | "skipping" | "amenorrhea_12m">("irregular");
  const [cycleNotes, setCycleNotes] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");

  // Persist logs
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch {}
  }, [logs]);

  // Compute Evidence-Based Perimenopause Score (0 - 100)
  const currentScore = useMemo(() => {
    if (logs.length === 0) {
      // Base score on today's current form values
      let s = 10;
      s += hotFlashes * 3.5;
      if (hotFlashSeverity === "moderate") s += 8;
      if (hotFlashSeverity === "severe") s += 16;
      if (nightSweats) s += 12;
      if (sleepQuality <= 2) s += 10;
      if (energyLevel <= 2) s += 8;
      if (brainFog) s += 10;
      if (cycleStatus === "irregular") s += 15;
      if (cycleStatus === "skipping") s += 25;
      return Math.min(100, Math.round(s));
    }

    // Average from recent logs
    const recent = logs.slice(0, 7);
    const avgScore =
      recent.reduce((acc, log) => {
        let s = 10;
        s += (log.hotFlashFrequency || 0) * 3.5;
        if (log.hotFlashSeverity === "moderate") s += 8;
        if (log.hotFlashSeverity === "severe") s += 16;
        if (log.nightSweats) s += 12;
        if (log.sleepQuality <= 2) s += 10;
        if (log.energyLevel <= 2) s += 8;
        if (log.brainFog) s += 10;
        if (log.cycleStatus === "irregular") s += 15;
        if (log.cycleStatus === "skipping") s += 25;
        return acc + s;
      }, 0) / recent.length;

    return Math.min(100, Math.round(avgScore));
  }, [logs, hotFlashes, hotFlashSeverity, nightSweats, sleepQuality, energyLevel, brainFog, cycleStatus]);

  function getScoreCategory(score: number) {
    if (score < 30) {
      return {
        label: "Mild / Early Signs",
        color: "text-emerald-700 bg-emerald-500/10 border-emerald-500/30",
        summary: "Subtle hormonal shifts. Focus on restorative circadian rhythm, magnesium, and stress reduction.",
      };
    }
    if (score < 65) {
      return {
        label: "Moderate Perimenopausal Transition",
        color: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30",
        summary: "Active transition phase with noticeable vasomotor and cycle variations. Ideal time to discuss bioidentical MHT/HRT options.",
      };
    }
    return {
      label: "Significant Symptom Impact",
      color: "text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/30",
      summary: "High vasomotor and sleep disruption. Strongly recommended to bring this report to a menopause-certified practitioner.",
    };
  }

  const scoreMeta = getScoreCategory(currentScore);

  function handleSaveLog(e: React.FormEvent) {
    e.preventDefault();
    const newEntry: PerimenopauseLog = {
      id: `peri-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      hotFlashFrequency: hotFlashes,
      hotFlashSeverity,
      sleepHours,
      sleepQuality,
      nightSweats,
      energyLevel,
      mood,
      brainFog,
      cycleStatus,
      cycleNotes: cycleNotes.trim(),
      notes: generalNotes.trim(),
    };

    setLogs((prev) => [newEntry, ...prev.filter((x) => x.date !== newEntry.date)]);
    toast.success("Perimenopause log recorded! Score updated.");
    setGeneralNotes("");
  }

  function handleDeleteLog(id: string) {
    setLogs((prev) => prev.filter((x) => x.id !== id));
    toast.success("Entry removed.");
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-primary/10 border border-amber-500/25 p-6 sm:p-8 backdrop-blur-md shadow-xs overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <p className="text-xs uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400 font-semibold">
            Sovereign Midlife Intelligence · Perimenopause &amp; Menopause
          </p>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-serif italic text-foreground tracking-tight">
              Perimenopause &amp; Menopause Hub
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed font-light">
              Demystify the second puberty. Track vasomotor surges, sleep awakenings, mood shifts, and cycle variations with clinical clarity and tailored self-advocacy.
            </p>
          </div>

          {/* Quick Score Badge */}
          <div className="shrink-0 p-4 rounded-2xl bg-card/90 border border-border/80 shadow-xs text-center min-w-[170px]">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Perimenopause Score
            </p>
            <div className="flex items-baseline justify-center gap-1 mt-1">
              <span className="text-3xl font-serif italic font-bold text-foreground">{currentScore}</span>
              <span className="text-xs text-muted-foreground font-sans">/100</span>
            </div>
            <Badge variant="outline" className={`mt-2 text-[10px] rounded-full px-2.5 py-0.5 border ${scoreMeta.color}`}>
              {scoreMeta.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Menopause Timeline Navigator */}
      <Card className="rounded-3xl border border-border/80 shadow-xs bg-card/90 backdrop-blur-md overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <CardTitle className="font-serif italic text-xl">Menopause Stages Timeline</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">Based on the STRAW+10 Clinical Framework</span>
          </div>
          <CardDescription className="text-xs">
            Tap a stage below to explore hormonal biomarkers, typical symptoms, and longevity priorities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stage Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {MENOPAUSE_STAGES.map((s) => {
              const active = selectedStage === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStage(s.id)}
                  className={`p-3 rounded-2xl text-left border transition-all duration-200 cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-xs scale-[1.02]"
                      : "bg-secondary/40 border-border/60 text-foreground hover:bg-secondary hover:border-border"
                  }`}
                >
                  <p className="text-[11px] font-semibold tracking-wide uppercase opacity-80">{s.ageRange}</p>
                  <p className="font-serif italic text-sm font-semibold mt-0.5">{s.title}</p>
                  <p className={`text-[10px] mt-1 line-clamp-1 ${active ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
                    {s.indicator}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active Stage Detailed Breakdown */}
          {(() => {
            const activeStage = MENOPAUSE_STAGES.find((s) => s.id === selectedStage) || MENOPAUSE_STAGES[1];
            return (
              <div className="p-4 sm:p-5 rounded-2xl bg-secondary/30 border border-border/70 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <h3 className="font-serif italic text-lg text-foreground font-semibold">
                      {activeStage.title} ({activeStage.ageRange})
                    </h3>
                  </div>
                  <Badge variant="outline" className="text-xs rounded-full border-primary/40 bg-primary/10 text-primary">
                    Key Landmark: {activeStage.indicator}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-light">
                  {activeStage.description}
                </p>
                <div className="pt-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Core Biomarkers &amp; Hallmarks:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeStage.symptoms.map((sym, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-card border border-border/80 text-foreground/90"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {sym}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Main Grid: Daily Perimenopause Tracker & Insights */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Comprehensive Tracking Form */}
        <Card className="lg:col-span-7 rounded-3xl border border-border/80 shadow-xs bg-card/90 backdrop-blur-md">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="font-serif italic text-xl">Daily Midlife Symptom Tracker</CardTitle>
                <CardDescription className="text-xs">
                  Log today&apos;s vasomotor, sleep, and cycle shifts to calculate your trend score.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveLog} className="space-y-4">
              {/* 1. Hot Flashes & Vasomotor Surges */}
              <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/60 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <Thermometer className="w-3.5 h-3.5 text-amber-600" /> Hot Flashes Today ({hotFlashes} episodes)
                  </Label>
                  <span className="text-xs text-muted-foreground">{hotFlashes} / day</span>
                </div>
                <Slider
                  value={[hotFlashes]}
                  min={0}
                  max={12}
                  step={1}
                  onValueChange={([val]) => setHotFlashes(val)}
                  className="py-1"
                />

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Severity</Label>
                    <Select value={hotFlashSeverity} onValueChange={(v: any) => setHotFlashSeverity(v)}>
                      <SelectTrigger className="rounded-xl h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="mild">Mild (Warmth without sweat)</SelectItem>
                        <SelectItem value="moderate">Moderate (Sweating &amp; stopping activity)</SelectItem>
                        <SelectItem value="severe">Severe (Drenching &amp; palpitations)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between pt-4 pr-1">
                    <div>
                      <Label htmlFor="nightSweats" className="text-xs font-medium cursor-pointer">
                        Night Sweats?
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Woke up drenched</p>
                    </div>
                    <Switch id="nightSweats" checked={nightSweats} onCheckedChange={setNightSweats} />
                  </div>
                </div>
              </div>

              {/* 2. Sleep Tracking & 3AM Awakenings */}
              <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/60 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <Moon className="w-3.5 h-3.5 text-indigo-500" /> Sleep Duration ({sleepHours} hours)
                  </Label>
                  <span className="text-xs text-muted-foreground">{sleepHours} hrs</span>
                </div>
                <Slider
                  value={[sleepHours]}
                  min={3}
                  max={11}
                  step={0.5}
                  onValueChange={([val]) => setSleepHours(val)}
                  className="py-1"
                />

                <div className="flex items-center justify-between pt-1">
                  <Label className="text-xs text-muted-foreground">Sleep Restorativeness</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSleepQuality(lvl)}
                        className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
                          sleepQuality === lvl
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-secondary text-muted-foreground hover:bg-secondary/80 border border-border/50"
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Energy, Mood & Brain Fog */}
              <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/60 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold flex items-center gap-1 text-foreground">
                      <Zap className="w-3.5 h-3.5 text-amber-500" /> Energy: {energyLevel}/5
                    </Label>
                    <div className="flex gap-1 pt-1">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setEnergyLevel(lvl)}
                          className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
                            energyLevel === lvl
                              ? "bg-amber-500 text-white shadow-xs"
                              : "bg-secondary text-muted-foreground hover:bg-secondary/80 border border-border/50"
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Dominant Mood</Label>
                    <Select value={mood} onValueChange={setMood}>
                      <SelectTrigger className="rounded-xl h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Calm & Balanced">Calm &amp; Balanced</SelectItem>
                        <SelectItem value="Irritable">Irritable / Short Fuse</SelectItem>
                        <SelectItem value="Anxious">Sudden Anxiety Surge</SelectItem>
                        <SelectItem value="Low Mood / Weepy">Low Mood / Weepy</SelectItem>
                        <SelectItem value="Resilient & Focused">Resilient &amp; Focused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <div>
                      <Label htmlFor="brainFog" className="text-xs font-medium cursor-pointer">
                        Brain Fog / Word-Finding Hesitation
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Difficulty recalling words or names</p>
                    </div>
                  </div>
                  <Switch id="brainFog" checked={brainFog} onCheckedChange={setBrainFog} />
                </div>
              </div>

              {/* 4. Cycle Changes & Irregularity */}
              <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/60 space-y-2.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Calendar className="w-3.5 h-3.5 text-rose-500" /> Cycle Pattern This Month
                </Label>
                <Select value={cycleStatus} onValueChange={(v: any) => setCycleStatus(v)}>
                  <SelectTrigger className="rounded-xl text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="regular">Regular cycle (24 - 32 days)</SelectItem>
                    <SelectItem value="irregular">Irregular (varies by 7+ days or unexpected flow)</SelectItem>
                    <SelectItem value="skipping">Skipping periods (60+ days without bleeding)</SelectItem>
                    <SelectItem value="amenorrhea_12m">12+ consecutive months no bleeding (Menopause)</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  value={cycleNotes}
                  onChange={(e) => setCycleNotes(e.target.value)}
                  placeholder="Cycle notes (e.g. Day 42, spotting yesterday, flow heavy for 2 days)..."
                  className="rounded-xl text-xs bg-background h-9"
                  maxLength={120}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label className="text-xs font-medium">Personal Notes / Triggers</Label>
                <Textarea
                  rows={2}
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="e.g. Coffee after 2pm triggered hot flash; cooling pillow helped sleep..."
                  className="rounded-xl text-xs bg-secondary/30"
                  maxLength={300}
                />
              </div>

              <Button
                type="submit"
                className="w-full rounded-full bg-primary text-primary-foreground hover:brightness-105 font-medium cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Save Daily Midlife Log
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right Column: Personalized Clinical Insights & Past Logs */}
        <div className="lg:col-span-5 space-y-6">
          {/* Personalized Clinical Insights Card */}
          <Card className="rounded-3xl border border-primary/25 bg-card/90 backdrop-blur-md shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-serif italic text-lg text-foreground font-semibold">
                Personalized Clinical Insights
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              {/* Insight 1: Vasomotor Guidance */}
              <div className="p-3 rounded-2xl bg-secondary/40 border border-border/60 space-y-1">
                <p className="font-semibold text-primary flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" /> Vasomotor Relief Strategy
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Estrogen dips narrow the hypothalamus thermoregulatory neutral zone. Keep bedroom temperature at 65°F (18°C), wear moisture-wicking bamboo/linen layers, and try 4-7-8 cooling breathwork during surges.
                </p>
              </div>

              {/* Insight 2: Sleep & Progesterone */}
              <div className="p-3 rounded-2xl bg-secondary/40 border border-border/60 space-y-1">
                <p className="font-semibold text-primary flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-indigo-500" /> Progesterone &amp; GABA Sleep Connection
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Progesterone converts into allopregnanolone, a neurosteroid that binds GABA-A receptors. When cycles become anovulatory, progesterone drops first, explaining sudden 3:00 AM awakenings. Magnesium glycinate (300-400 mg) and tart cherry extract provide natural GABAergic support.
                </p>
              </div>

              {/* Insight 3: Bone & Muscle Protection */}
              <div className="p-3 rounded-2xl bg-secondary/40 border border-border/60 space-y-1">
                <p className="font-semibold text-primary flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Musculoskeletal &amp; Bone Blueprint
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Estrogen directly protects osteoblast bone renewal and satellite muscle fibers. Prioritize 25-30g protein per meal and resistance training 3x/week to preserve lean mass and bone density before menopausal bone remodeling accelerates.
                </p>
              </div>

              {/* Insight 4: Hormone Therapy Dialogue */}
              <div className="p-3 rounded-2xl bg-secondary/40 border border-border/60 space-y-1">
                <p className="font-semibold text-primary flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-primary" /> Questions to Ask Your Doctor
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <em>&ldquo;Given my vasomotor symptoms and cycle variation, would transdermal 17-beta estradiol paired with micronized oral progesterone be appropriate for my symptom relief and bone preservation?&rdquo;</em>
                </p>
              </div>
            </div>
          </Card>

          {/* Past Logs List */}
          <Card className="rounded-3xl border border-border/80 shadow-xs bg-card/90 backdrop-blur-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="font-serif italic text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" /> Recent Logs ({logs.length})
                </CardTitle>
                {logs.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Clear all perimenopause logs?")) setLogs([]);
                    }}
                    className="text-[11px] h-6 px-2 text-muted-foreground hover:text-destructive"
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No logs recorded yet. Use the tracker on the left to log your first day!
                </p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-2xl bg-secondary/35 border border-border/60 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{log.date}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] rounded-full">
                          {log.hotFlashFrequency} hot flashes
                        </Badge>
                        <button
                          type="button"
                          onClick={() => handleDeleteLog(log.id)}
                          className="text-muted-foreground hover:text-destructive p-0.5 cursor-pointer"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                      <span>Sleep: {log.sleepHours}h ({log.sleepQuality}/5)</span>
                      <span>·</span>
                      <span>Energy: {log.energyLevel}/5</span>
                      <span>·</span>
                      <span>Mood: {log.mood}</span>
                      {log.nightSweats && <Badge variant="secondary" className="text-[9px] px-1 py-0">Night sweats</Badge>}
                      {log.brainFog && <Badge variant="secondary" className="text-[9px] px-1 py-0">Brain fog</Badge>}
                    </div>
                    {log.cycleNotes && (
                      <p className="text-[11px] text-foreground/80 italic">Cycle: {log.cycleNotes}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
