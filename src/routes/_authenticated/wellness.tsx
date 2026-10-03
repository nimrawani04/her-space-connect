import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeJournal } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  LifeBuoy,
  Sparkles,
  Wind,
  Heart,
  Lock,
  Calendar,
  Smile,
  BookHeart,
  RotateCcw,
  Play,
  Pause,
  ChevronRight,
  Shield,
  PhoneCall,
  CheckCircle2,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/wellness")({
  head: () => ({ meta: [{ title: "Mental Wellness & Reflection · HerSpace" }] }),
  component: Wellness,
});

type Entry = {
  id: string;
  content: string;
  mood: string | null;
  ai_insight: string | null;
  created_at: string;
};

type JournalResult = Awaited<ReturnType<typeof analyzeJournal>>;

const MOOD_PRESETS = [
  { label: "Calm & Grounded", emoji: "🌿" },
  { label: "Reflective & Soft", emoji: "🌊" },
  { label: "Grateful & Centered", emoji: "🌸" },
  { label: "Hopeful & Inspired", emoji: "💫" },
  { label: "Anxious & Restless", emoji: "⚡" },
  { label: "Overwhelmed & Heavy", emoji: "🌧️" },
  { label: "Tired & Depleted", emoji: "🍂" },
];

const GUIDED_PROMPTS = [
  "What is one thing my body and heart carried with grace today?",
  "Where did I experience friction today, and what boundary was calling to be set?",
  "What is a small tenderness, beauty, or kindness I noticed today?",
  "What feeling or expectation am I ready to exhale and release tonight?",
];

function BreathingWidget() {
  const [phase, setPhase] = useState<"Ready" | "Inhale" | "Hold" | "Exhale">("Ready");
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isRunning) {
      setPhase("Ready");
      setTimeLeft(0);
      return;
    }

    let currentPhase: "Inhale" | "Hold" | "Exhale" = "Inhale";
    let seconds = 4;
    setPhase("Inhale");
    setTimeLeft(4);

    timerRef.current = setInterval(() => {
      seconds -= 1;
      if (seconds <= 0) {
        if (currentPhase === "Inhale") {
          currentPhase = "Hold";
          seconds = 7;
        } else if (currentPhase === "Hold") {
          currentPhase = "Exhale";
          seconds = 8;
        } else {
          currentPhase = "Inhale";
          seconds = 4;
        }
        setPhase(currentPhase);
      }
      setTimeLeft(seconds);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  return (
    <Card className="rounded-3xl bg-card/90 border border-border/80 backdrop-blur-md shadow-xs overflow-hidden">
      <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Wind className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif italic text-base text-foreground font-semibold">
                Somatic Grounding Breath (4-7-8)
              </h3>
              <Badge variant="outline" className="text-[10px] rounded-full bg-secondary/40 border-border/60">
                Nervous System
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
              Take 60 seconds to quiet cortisol and regulate vagal tone before writing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {isRunning ? (
            <div className="flex items-center gap-2 bg-secondary/40 border border-border/70 rounded-full px-4 py-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                {phase} {timeLeft > 0 ? `· ${timeLeft}s` : ""}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground hidden md:inline">
              Inhale 4s · Hold 7s · Exhale 8s
            </span>
          )}

          <Button
            size="sm"
            variant={isRunning ? "outline" : "default"}
            onClick={() => setIsRunning(!isRunning)}
            className="rounded-full px-4 gap-1.5 text-xs shrink-0"
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Begin Breath
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Wellness() {
  const analyze = useServerFn(analyzeJournal);
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("");
  const [customMood, setCustomMood] = useState(false);
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<JournalResult | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  async function load() {
    const { data } = await supabase
      .from("journal_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25);
    setEntries((data as Entry[]) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit() {
    if (content.trim().length < 10) {
      toast.error("Write at least a sentence or two to reflect.");
      return;
    }
    setLoading(true);
    setInsight(null);

    try {
      const r = await analyze({ data: { content, mood: mood || undefined } });
      setInsight(r);
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        await supabase.from("journal_entries").insert({
          user_id: u.user.id,
          content,
          mood: mood || null,
          ai_insight: r.reflection,
        });
        load();
      }
      toast.success("Reflection generated and saved to your private sanctuary");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not analyze right now.");
    } finally {
      setLoading(false);
    }
  }

  const handleSelectPrompt = (promptText: string) => {
    if (content.trim()) {
      setContent((prev) => `${prev}\n\n${promptText}\n`);
    } else {
      setContent(`${promptText}\n\n`);
    }
    toast.info("Prompt added to your entry");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Frosted Sanctuary Header */}
      <header className="relative rounded-3xl bg-card/90 border border-border/80 p-6 sm:p-8 backdrop-blur-md shadow-xs overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
            09 · Emotional Sanctuary &amp; Reflection
          </p>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif italic text-foreground tracking-tight">
          Mental Wellness
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base leading-relaxed font-light">
          A non-judgmental space to exhale, untangle feelings, and reflect. Your journal is private,
          encrypted, and mirrored back with trauma-informed empathy.
        </p>
      </header>

      {/* Somatic Grounding Breath Widget */}
      <BreathingWidget />

      {/* Main Sanctuary Workspace */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Journal Writer */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="rounded-3xl bg-card/90 border border-border/80 backdrop-blur-md shadow-xs overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <BookHeart className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="font-serif italic text-xl text-foreground">
                      Tonight&apos;s Entry
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      How is your body and mind feeling right now?
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                  <Lock className="w-3.5 h-3.5 text-primary/70" />
                  <span className="hidden sm:inline">Encrypted &amp; Private</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Mood Selection Palette */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Smile className="w-3.5 h-3.5 text-primary" /> Current State of Mind
                  </Label>
                  <button
                    type="button"
                    onClick={() => setCustomMood(!customMood)}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    {customMood ? "Use presets" : "Custom mood"}
                  </button>
                </div>

                {!customMood ? (
                  <div className="flex flex-wrap gap-2">
                    {MOOD_PRESETS.map((m) => {
                      const selected = mood === m.label;
                      return (
                        <button
                          key={m.label}
                          type="button"
                          onClick={() => setMood(selected ? "" : m.label)}
                          className={`text-xs px-3.5 py-1.5 rounded-full transition-all duration-200 border flex items-center gap-1.5 ${
                            selected
                              ? "bg-primary text-primary-foreground border-primary shadow-xs scale-102 font-medium"
                              : "bg-secondary/40 text-foreground border-border/70 hover:border-primary/40 hover:bg-secondary/70"
                          }`}
                        >
                          <span>{m.emoji}</span>
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <Input
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    placeholder="Describe how you feel (e.g. tender, restless, quietly happy)..."
                    className="rounded-2xl h-10 text-xs bg-background/80"
                    maxLength={40}
                  />
                )}
              </div>

              {/* Guided Inspiration Prompts */}
              <div className="space-y-2 pt-1 border-t border-border/50">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" /> Staring at a blank page? Tap a prompt:
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {GUIDED_PROMPTS.map((promptText, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectPrompt(promptText)}
                      className="text-left text-xs p-2.5 rounded-2xl bg-secondary/30 hover:bg-primary/10 hover:border-primary/30 border border-border/60 text-muted-foreground hover:text-foreground transition-all line-clamp-2 leading-relaxed"
                    >
                      &ldquo;{promptText}&rdquo;
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Area */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Unburden without filter
                </Label>
                <Textarea
                  rows={9}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What thoughts are sitting with you? Let them flow onto the page without needing them to make perfect sense..."
                  maxLength={8000}
                  className="rounded-2xl p-4 bg-background/80 border-border/80 text-foreground placeholder:text-muted-foreground/70 resize-none leading-relaxed text-sm focus-visible:ring-primary/20"
                />
                <div className="flex justify-between items-center text-[11px] text-muted-foreground px-1 pt-1">
                  <span>{content.length} / 8000 characters</span>
                  <span>{content.trim() ? `${content.trim().split(/\s+/).length} words` : "0 words"}</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex justify-between items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setContent("");
                    setMood("");
                  }}
                  disabled={!content && !mood}
                  className="text-xs text-muted-foreground hover:text-destructive rounded-full"
                >
                  Clear draft
                </Button>

                <Button
                  onClick={submit}
                  disabled={loading || content.trim().length < 10}
                  className="rounded-full px-7 h-11 bg-primary text-primary-foreground hover:brightness-105 font-medium transition-all shadow-sm"
                >
                  {loading ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      Reflecting deeply…
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4 mr-2" />
                      Save &amp; Reflect
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: AI Mirror & Journal Archive */}
        <div className="lg:col-span-5 space-y-6">
          {/* AI Gentle Mirror Result */}
          {insight && (
            <div className="space-y-4 animate-fade-in">
              {insight.escalation.suggested && (
                <Alert variant="destructive" className="rounded-3xl border-destructive/40 bg-destructive/10">
                  <LifeBuoy className="h-4 w-4" />
                  <AlertTitle className="font-serif italic font-semibold">
                    Gentle sisterhood check-in
                  </AlertTitle>
                  <AlertDescription className="text-xs leading-relaxed mt-1">
                    {insight.escalation.reason ??
                      "What you wrote suggests you are navigating immense weight right now."}{" "}
                    You do not have to carry this alone. Please consider reaching out to a trusted loved
                    one, or an international confidential crisis helpline.
                  </AlertDescription>
                </Alert>
              )}

              <Card className="rounded-3xl bg-card/90 border border-primary/30 backdrop-blur-md shadow-xs overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="rounded-full text-[10px] bg-primary/10 text-primary border-primary/20">
                      AI Companion Mirror
                    </Badge>
                  </div>
                  <CardTitle className="font-serif italic text-xl text-foreground">
                    A Gentle Mirror
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4 text-xs sm:text-sm leading-relaxed">
                  <p className="text-foreground/90 leading-relaxed font-light">
                    {insight.reflection}
                  </p>

                  {insight.emotionalThemes.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Emotional Themes Identified
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {insight.emotionalThemes.map((theme) => (
                          <Badge
                            key={theme}
                            variant="outline"
                            className="rounded-full text-[11px] bg-secondary/50 text-foreground border-border/70"
                          >
                            {theme}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {insight.gentlePrompt && (
                    <div className="rounded-2xl bg-secondary/35 border-l-3 border-primary p-3.5 my-2">
                      <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1">
                        Inquiry to Carry with You
                      </p>
                      <p className="font-serif italic text-sm sm:text-base text-foreground">
                        &ldquo;{insight.gentlePrompt}&rdquo;
                      </p>
                    </div>
                  )}

                  {insight.copingSuggestions.length > 0 && (
                    <div className="space-y-2 pt-1 border-t border-border/50">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Gentle Suggestions for Tonight
                      </p>
                      <ul className="space-y-2">
                        {insight.copingSuggestions.map((s, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-foreground/85">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Past Entries Archive */}
          <Card className="rounded-3xl bg-card/90 border border-border/80 backdrop-blur-md shadow-xs overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-serif italic text-xl text-foreground">
                    Reflective Archive
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your personal growth journey and insights
                  </p>
                </div>
                <Badge variant="outline" className="text-xs rounded-full font-mono">
                  {entries.length} {entries.length === 1 ? "entry" : "entries"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {entries.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center space-y-2.5">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <BookHeart className="w-5 h-5" />
                  </div>
                  <h4 className="font-serif italic text-base text-foreground font-semibold">
                    Your Sanctuary is Waiting
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    Write your first reflection on the left. Whenever you save an entry, your insights
                    and emotional milestones will gather here.
                  </p>
                </div>
              )}

              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {entries.map((e) => {
                  const isExpanded = selectedEntry?.id === e.id;
                  return (
                    <div
                      key={e.id}
                      className={`rounded-2xl border transition-all duration-200 p-4 ${
                        isExpanded
                          ? "border-primary/50 bg-secondary/35 shadow-xs"
                          : "border-border/70 bg-card/60 hover:border-primary/30 hover:bg-secondary/20"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-primary" />
                          {new Date(e.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {e.mood && (
                          <Badge
                            variant="outline"
                            className="rounded-full text-[11px] bg-primary/10 text-primary border-primary/20"
                          >
                            {e.mood}
                          </Badge>
                        )}
                      </div>

                      <p
                        className={`text-xs sm:text-sm text-foreground/90 leading-relaxed font-light ${
                          isExpanded ? "" : "line-clamp-3"
                        }`}
                      >
                        {e.content}
                      </p>

                      {e.ai_insight && (
                        <div className="mt-3 pt-2.5 border-t border-border/50">
                          <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1">
                            Reflected Mirror
                          </p>
                          <p
                            className={`text-xs text-muted-foreground font-serif italic ${
                              isExpanded ? "" : "line-clamp-2"
                            }`}
                          >
                            &ldquo;{e.ai_insight}&rdquo;
                          </p>
                        </div>
                      )}

                      <div className="mt-2.5 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedEntry(isExpanded ? null : e)}
                          className="text-[11px] font-medium text-primary hover:underline flex items-center gap-0.5"
                        >
                          {isExpanded ? "Collapse" : "Read full reflection"}
                          <ChevronRight
                            className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Sister Crisis Support Notice */}
          <Card className="rounded-3xl bg-secondary/30 border border-border/60 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-4 h-4" />
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-foreground">Need Immediate Support?</p>
                <p className="text-muted-foreground leading-relaxed">
                  HerSpace provides reflective companionship, not crisis clinical intervention. If you
                  are in acute distress, call <strong className="text-foreground">988</strong> (US/Canada),{" "}
                  <strong className="text-foreground">111</strong> (UK), or your local emergency line.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}