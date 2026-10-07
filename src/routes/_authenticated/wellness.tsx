import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, Component, ReactNode, ErrorInfo } from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TalkToHerSpaceCompanion } from "@/components/wellness/TalkToHerSpaceCompanion";
import { toast } from "sonner";
import {
  LifeBuoy,
  Sparkles,
  Heart,
  Lock,
  Calendar,
  Smile,
  BookHeart,
  RotateCcw,
  ChevronRight,
  Shield,
  PhoneCall,
  CheckCircle2,
  Trash2,
  Pencil,
  MessageSquareHeart,
  Mic,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/wellness")({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  head: () => ({ meta: [{ title: "Mental Wellness & Reflection · HerSpace" }] }),
  component: Wellness,
});

class TabErrorBoundary extends Component<
  { tabName?: string; children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { tabName?: string; children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Tab error in", this.props.tabName, error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <Card className="rounded-3xl border border-destructive/30 bg-card p-8 text-center space-y-4">
          <div className="w-10 h-10 mx-auto rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-base">
              Unable to load {this.props.tabName ?? "this section"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              {this.state.error?.message || "An unexpected error occurred while rendering."}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-full text-xs"
          >
            Retry
          </Button>
        </Card>
      );
    }
    return this.props.children;
  }
}

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

function Wellness() {
  const search = Route.useSearch();
  const analyze = useServerFn(analyzeJournal);
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("");
  const [customMood, setCustomMood] = useState(false);
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<JournalResult | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (search?.tab === "journal") return "journal";
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("tab");
      if (p === "journal") return "journal";
    }
    return "talk";
  });

  // Edit & Delete journal entry state
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editMood, setEditMood] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [deletingEntry, setDeletingEntry] = useState<Entry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function startEdit(entry: Entry) {
    setEditingEntry(entry);
    setEditContent(entry.content);
    setEditMood(entry.mood ?? "");
  }

  async function saveEdit() {
    if (!editingEntry) return;
    if (editContent.trim().length < 5) {
      toast.error("Please enter a few words for your entry.");
      return;
    }
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("journal_entries")
        .update({
          content: editContent.trim(),
          mood: editMood || null,
        })
        .eq("id", editingEntry.id);

      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Journal entry updated.");
      setEditingEntry(null);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Could not update entry.");
    } finally {
      setIsUpdating(false);
    }
  }

  function startDelete(entry: Entry) {
    setDeletingEntry(entry);
  }

  async function confirmDelete() {
    if (!deletingEntry) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("journal_entries")
        .delete()
        .eq("id", deletingEntry.id);

      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Journal entry deleted.");
      if (selectedEntry?.id === deletingEntry.id) {
        setSelectedEntry(null);
      }
      setDeletingEntry(null);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Could not delete entry.");
    } finally {
      setIsDeleting(false);
    }
  }

  useEffect(() => {
    if (search?.tab) {
      setActiveTab(search.tab === "journal" ? "journal" : "talk");
    }
  }, [search?.tab]);

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
      <header className="relative rounded-3xl bg-card/90 border border-border/80 p-4 sm:p-6 md:p-8 backdrop-blur-md shadow-xs overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
            Emotional Sanctuary &amp; Reflection
          </p>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif italic text-foreground tracking-tight">
              Mental Wellness
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base leading-relaxed font-light">
              A non-judgmental space to exhale, untangle feelings, speak freely to HerSpace, and reflect. Your voice and journey are held in sovereign privacy.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium pb-1 shrink-0">
            <Button
              onClick={() => setActiveTab("talk")}
              size="sm"
              variant={activeTab === "talk" ? "default" : "outline"}
              className="rounded-full shadow-xs text-xs gap-1.5 font-medium cursor-pointer"
            >
              <MessageSquareHeart className="w-3.5 h-3.5" /> Talk to HerSpace
            </Button>
            <Button
              onClick={() => setActiveTab("journal")}
              size="sm"
              variant={activeTab === "journal" ? "default" : "outline"}
              className="rounded-full shadow-xs text-xs gap-1.5 font-medium cursor-pointer"
            >
              <BookHeart className="w-3.5 h-3.5" /> Journal
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto -mx-1 px-1 pb-1 scrollbar-none">
          <TabsList className="flex h-auto p-1.5 gap-1.5 bg-card/85 backdrop-blur-md border border-border/70 rounded-full w-max min-w-full sm:min-w-0">
            <TabsTrigger
              value="talk"
              className="gap-2 shrink-0 rounded-full text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground cursor-pointer"
            >
              <MessageSquareHeart className="w-3.5 h-3.5" /> Talk to HerSpace
            </TabsTrigger>
            <TabsTrigger
              value="journal"
              className="gap-2 shrink-0 rounded-full text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground cursor-pointer"
            >
              <BookHeart className="w-3.5 h-3.5" /> Journal
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="talk" className="space-y-6">
          <TabErrorBoundary tabName="Talk to HerSpace">
            <TalkToHerSpaceCompanion
              onSaveToJournal={(reflectionText) => {
                setContent(reflectionText);
                setActiveTab("journal");
              }}
            />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="journal" className="space-y-6">
          <TabErrorBoundary tabName="Journal">
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

                      <div className="mt-3 pt-2.5 flex items-center justify-between border-t border-border/50 gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(e)}
                            className="h-7 px-2.5 text-[11px] rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/70 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3 mr-1 text-primary" /> Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => startDelete(e)}
                            className="h-7 px-2.5 text-[11px] rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3 mr-1 text-destructive" /> Delete
                          </Button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedEntry(isExpanded ? null : e)}
                          className="text-[11px] font-medium text-primary hover:underline flex items-center gap-0.5 cursor-pointer ml-auto"
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
          </TabErrorBoundary>
        </TabsContent>
      </Tabs>

      {/* Edit Journal Entry Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="sm:max-w-lg rounded-3xl bg-card border border-border/80 p-5 sm:p-7 shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-serif italic text-2xl text-foreground flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" /> Edit Journal Entry
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Revise your written reflection or update how you were feeling.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Mood reflection:</Label>
              <div className="flex flex-wrap gap-1.5">
                {MOOD_PRESETS.map((m) => (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => setEditMood(editMood === m.label ? "" : m.label)}
                    className={`px-3 py-1 rounded-full text-xs border transition-all cursor-pointer ${
                      editMood === m.label
                        ? "bg-primary text-primary-foreground border-primary font-medium"
                        : "bg-secondary/40 text-muted-foreground border-border/70 hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <span>{m.emoji}</span> <span className="ml-1">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Reflection Content:</Label>
              <Textarea
                rows={6}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Write your reflection here..."
                className="rounded-2xl bg-background border-border/80 text-xs sm:text-sm p-3.5 resize-none leading-relaxed focus-visible:ring-primary"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingEntry(null)}
              className="rounded-full text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={saveEdit}
              disabled={isUpdating}
              className="rounded-full text-xs bg-primary text-primary-foreground hover:brightness-105"
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingEntry} onOpenChange={(open) => !open && setDeletingEntry(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card border border-border/80 p-5 sm:p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-serif italic text-xl text-foreground flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" /> Delete Journal Entry?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              This reflection will be permanently removed from your private sanctuary archive. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deletingEntry && (
            <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/60 text-xs text-foreground/80 line-clamp-3 italic">
              &ldquo;{deletingEntry.content}&rdquo;
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingEntry(null)}
              className="rounded-full text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="rounded-full text-xs"
            >
              {isDeleting ? "Deleting..." : "Delete Entry"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}