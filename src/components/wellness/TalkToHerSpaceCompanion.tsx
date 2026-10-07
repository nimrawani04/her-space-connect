import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { tellHerSpace } from "@/lib/tell-herspace.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquareHeart,
  Send,
  Mic,
  MicOff,
  Sparkles,
  BookHeart,
  RotateCcw,
  Wind,
  CheckCircle2,
  HeartHandshake,
  Bot,
  User,
  Compass,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Lock,
  FileText,
  X,
  LogOut,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import CarePathwayNavigator from "@/components/health/CarePathwayNavigator";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  theme?: string;
  suggestedActions?: string[];
  reflectionPrompt?: string;
  groundingExercise?: {
    name: string;
    instructions: string[];
  };
  urgency?: "emergency" | "urgent" | "soon" | "routine";
  dangerCheck?: string | null;
  supportAreas?: string[];
  followUpQuestions?: string[];
  nextSteps?: { title: string; detail: string }[];
  resources?: { name: string; what: string; how: string }[];
  documentsToPrepare?: string[];
}

const URGENCY_STYLE: Record<string, { label: string; badgeCls: string; borderCls: string }> = {
  emergency: {
    label: "Emergency Support Recommended",
    badgeCls: "bg-destructive text-destructive-foreground animate-pulse shadow-xs",
    borderCls: "border-destructive/40 bg-destructive/5",
  },
  urgent: {
    label: "Time-Sensitive Priority (1-2 Days)",
    badgeCls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
    borderCls: "border-amber-500/30 bg-amber-500/5",
  },
  soon: {
    label: "Action Recommended Soon",
    badgeCls: "bg-primary/15 text-primary border border-primary/30",
    borderCls: "border-primary/30 bg-primary/5",
  },
  routine: {
    label: "Gentle Routine Exploration",
    badgeCls: "bg-secondary/80 text-foreground border border-border/70",
    borderCls: "border-border/60 bg-secondary/20",
  },
};

const AREA_LABEL: Record<string, { label: string; icon: string }> = {
  safety: { label: "Personal Safety", icon: "🛡️" },
  health: { label: "Physical Health", icon: "🩺" },
  mental_wellbeing: { label: "Emotional Support", icon: "🌿" },
  legal: { label: "Rights & Legal", icon: "⚖️" },
  workplace_or_education: { label: "Work & University", icon: "💼" },
  financial: { label: "Financial Security", icon: "🪙" },
  relationships: { label: "Relationships", icon: "🤝" },
  reproductive: { label: "Reproductive Health", icon: "🌸" },
  housing: { label: "Housing & Shelter", icon: "🏡" },
  other: { label: "General Wellness", icon: "✨" },
};

const GENTLE_TOPIC_PILLS = [
  { label: "Emotional Health & Burnout", icon: "🌿", prompt: "I'm feeling emotionally overwhelmed and burnt out lately. Can we untangle this?" },
  { label: "Reproductive & Cycle Questions", icon: "🌸", prompt: "I have some concerns regarding my cycle and body health that I'd like guidance on." },
  { label: "Boundaries & Personal Safety", icon: "🛡️", prompt: "I need some confidential guidance about feeling uncomfortable or unsafe in a situation." },
  { label: "Workplace & Academic Pressure", icon: "⚖️", prompt: "I am facing pressure and distress at work/university and don't know my next steps." },
];

function getCompanionVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) =>
      v.lang.startsWith("en") &&
      (v.name.includes("Natural") ||
        v.name.includes("Female") ||
        v.name.includes("Samantha") ||
        v.name.includes("Victoria") ||
        v.name.includes("Google"))
  );
  return preferred || voices.find((v) => v.lang.startsWith("en")) || voices[0] || null;
}

interface TalkToHerSpaceCompanionProps {
  onSaveToJournal?: (reflectionText: string) => void;
}

export function TalkToHerSpaceCompanion({ onSaveToJournal }: TalkToHerSpaceCompanionProps) {
  const chatFn = useServerFn(tellHerSpace);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Welcome to your sacred sanctuary. Tell me what is happening in your life right now, in your own words.\n\nYou don't have to define whether it's a medical question, an emotional weight, a safety concern, or a life transition. I will listen tenderly, help untangle the pieces, check whether anything requires urgent care, and guide you toward clear next steps and real support.\n\nEverything shared here is held in confidential discretion and never saved to permanent storage without your choice.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showCarePathway, setShowCarePathway] = useState(false);
  const [showBreathingAnchor, setShowBreathingAnchor] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const baseInputRef = useRef<string>("");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Breathing loop when anchor is active
  useEffect(() => {
    if (!showBreathingAnchor) return;
    let timer: NodeJS.Timeout;

    if (breathingPhase === "inhale") {
      timer = setTimeout(() => setBreathingPhase("hold"), 4000);
    } else if (breathingPhase === "hold") {
      timer = setTimeout(() => setBreathingPhase("exhale"), 7000);
    } else {
      timer = setTimeout(() => setBreathingPhase("inhale"), 8000);
    }

    return () => clearTimeout(timer);
  }, [showBreathingAnchor, breathingPhase]);

  // Read aloud message
  const handleToggleSpeak = (msgId: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Speech synthesis is not supported on this browser.");
      return;
    }

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voice = getCompanionVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Copy message text
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Reflection copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Quick exit for emergency privacy
  const handleQuickExit = () => {
    window.location.replace("https://www.google.com");
  };

  // Voice speech-to-text
  const toggleVoiceTalk = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      baseInputRef.current = "";
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser. Please type your thoughts.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang =
        typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";

      baseInputRef.current = input;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("Listening... Speak peacefully to HerSpace");
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item && item[0]) {
            if (item.isFinal) {
              finalTranscript += item[0].transcript + " ";
            } else {
              interimTranscript += item[0].transcript + " ";
            }
          }
        }

        const spoken = (finalTranscript + interimTranscript).trim();
        if (spoken) {
          const base = baseInputRef.current.trim();
          const nextVal = base ? `${base} ${spoken}` : spoken;
          setInput(nextVal.replace(/\s+/g, " "));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
        baseInputRef.current = "";
      };

      recognition.onend = () => {
        setIsListening(false);
        baseInputRef.current = "";
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech recognition failed:", err);
      setIsListening(false);
      baseInputRef.current = "";
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || loading) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      baseInputRef.current = "";
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const history = nextMessages
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await chatFn({
        data: {
          message: text,
          history,
        },
      });

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        theme: res.theme,
        urgency: res.urgency,
        dangerCheck: res.dangerCheck,
        supportAreas: res.supportAreas,
        followUpQuestions: res.followUpQuestions,
        nextSteps: res.nextSteps,
        resources: res.resources,
        documentsToPrepare: res.documentsToPrepare,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error("Tell HerSpace error:", error);
      toast.error(error instanceof Error ? error.message : "Could not connect to companion right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
    setMessages([
      {
        id: "welcome-new",
        role: "assistant",
        content:
          "I am here whenever you're ready to share. How can I hold space and support you right now?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setShowCarePathway(false);
    setShowBreathingAnchor(false);
    toast.info("Sanctuary refreshed with a clean slate");
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          LUXURY SANCTUARY HEADER BANNER
          ========================================================================= */}
      <div className="relative rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card/90 to-background/95 backdrop-blur-xl p-5 sm:p-7 md:p-8 shadow-xl overflow-hidden transition-all duration-300">
        {/* Soft Ambient Radial Lights */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Lock className="w-3 h-3" /> Private Sanctuary · Zero Trace
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="w-3 h-3" /> Empathetic AI Companion
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif italic text-foreground tracking-tight">
              {showCarePathway ? "Clinical & Subsidized Healthcare Navigator" : "Talk to HerSpace"}
            </h2>

            <p className="text-xs sm:text-sm text-muted-foreground font-light max-w-2xl leading-relaxed">
              {showCarePathway
                ? "Locate sliding-scale reproductive care, public hospital OPDs, and preparation checklists."
                : "A gentle, confidential listening sanctuary. Describe whatever you are navigating in your own words — we will check safety, clarify options, and bridge you to genuine real-world care."}
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 shrink-0">
            {/* Mindful Breathing Toggle */}
            <Button
              type="button"
              variant={showBreathingAnchor ? "default" : "outline"}
              size="sm"
              onClick={() => setShowBreathingAnchor(!showBreathingAnchor)}
              className="rounded-full text-xs h-8.5 px-3.5 border-border/70 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer shadow-2xs"
              title="Toggle mindful 4-7-8 breathing circle"
            >
              <Wind className="w-3.5 h-3.5 mr-1.5 text-primary" />
              {showBreathingAnchor ? "Close Breathwork" : "Mindful Breath"}
            </Button>

            {/* Care Pathway Switcher */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCarePathway(!showCarePathway)}
              className="rounded-full text-xs h-8.5 px-3.5 border-border/70 hover:bg-secondary/80 transition-all cursor-pointer shadow-2xs"
            >
              <Compass className="w-3.5 h-3.5 mr-1.5 text-primary" />
              {showCarePathway ? "Return to Sanctuary" : "Clinic Navigator"}
            </Button>

            {/* Clear Sanctuary */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="rounded-full text-xs h-8.5 px-3 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Clear conversation"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Clear
            </Button>

            {/* Quick Emergency Exit */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleQuickExit}
              className="rounded-full text-xs h-8.5 px-2.5 text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
              title="Instant escape to Google for discretion"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" /> Quick Exit
            </Button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MINDFUL BREATHING ANCHOR (4-7-8 NERVOUS SYSTEM REGULATION)
          ========================================================================= */}
      {showBreathingAnchor && (
        <Card className="rounded-3xl border border-primary/30 bg-gradient-to-b from-primary/10 via-card/90 to-background p-6 backdrop-blur-xl shadow-lg animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              <p className="text-xs uppercase tracking-widest text-primary font-semibold">
                Nervous System Grounding · 4-7-8 Cadence
              </p>
            </div>
            <button
              onClick={() => setShowBreathingAnchor(false)}
              className="text-xs text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary/80"
              aria-label="Dismiss breathwork"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
            <div className="relative flex items-center justify-center">
              {/* Pulsing Breathing Orb */}
              <div
                className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full flex items-center justify-center transition-all duration-[4000ms] ease-in-out shadow-2xl ${
                  breathingPhase === "inhale"
                    ? "scale-125 bg-gradient-to-tr from-primary/30 to-rose-400/30 border-2 border-primary"
                    : breathingPhase === "hold"
                    ? "scale-125 bg-gradient-to-tr from-amber-400/20 to-primary/30 border-2 border-amber-400/60"
                    : "scale-90 bg-gradient-to-tr from-secondary/60 to-primary/10 border border-border"
                }`}
              >
                <div className="space-y-1">
                  <p className="text-sm sm:text-base font-serif italic text-foreground font-medium">
                    {breathingPhase === "inhale"
                      ? "Inhale Gently (4s)"
                      : breathingPhase === "hold"
                      ? "Hold Softly (7s)"
                      : "Exhale Completely (8s)"}
                  </p>
                  <p className="text-[10px] text-muted-foreground tracking-widest uppercase">
                    Feel the release
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground max-w-md font-light">
              Allow your shoulders to soften. You are entirely safe in this moment. Whenever you feel centered, begin sharing below.
            </p>
          </div>
        </Card>
      )}

      {/* =========================================================================
          VIEW CLINICAL CARE PATHWAY IF TOGGLED
          ========================================================================= */}
      {showCarePathway ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/50 border border-border/80 text-xs text-muted-foreground">
            <span>Viewing dedicated Clinic Finding &amp; Healthcare Pathway Navigator.</span>
            <button
              onClick={() => setShowCarePathway(false)}
              className="text-primary font-medium hover:underline flex items-center gap-1 cursor-pointer"
            >
              Return to conversational companion &rarr;
            </button>
          </div>
          <CarePathwayNavigator />
        </div>
      ) : (
        /* =========================================================================
            MAIN CONVERSATION SANCTUARY
            ========================================================================= */
        <div className="space-y-5">
          {/* Messages Log Container */}
          <div className="rounded-3xl border border-border/80 bg-card/60 backdrop-blur-2xl shadow-xl p-4 sm:p-6 md:p-8 space-y-6 min-h-[460px] max-h-[680px] overflow-y-auto scrollbar-thin">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start gap-3 sm:gap-4 ${
                  m.role === "user" ? "flex-row-reverse" : "flex-row"
                } group`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs transition-transform duration-300 ${
                    m.role === "user"
                      ? "bg-gradient-to-tr from-primary to-rose-500 text-primary-foreground"
                      : "bg-gradient-to-tr from-primary/20 via-background to-secondary text-primary border border-primary/20"
                  }`}
                >
                  {m.role === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <MessageSquareHeart className="w-4.5 h-4.5 text-primary" />
                  )}
                </div>

                {/* Bubble Container */}
                <div
                  className={`space-y-4 max-w-xl sm:max-w-2xl lg:max-w-3xl rounded-3xl p-5 sm:p-6 text-xs sm:text-sm leading-relaxed transition-all shadow-md ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-primary via-primary/95 to-primary/85 text-primary-foreground rounded-tr-xs"
                      : "bg-background/85 dark:bg-card/90 border border-primary/20 text-foreground rounded-tl-xs backdrop-blur-md"
                  }`}
                >
                  {/* Theme Badge & Controls */}
                  {m.role === "assistant" && (
                    <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {m.theme ? (
                          <Badge
                            variant="outline"
                            className="rounded-full text-[11px] font-medium bg-primary/10 text-primary border-primary/25"
                          >
                            <Sparkles className="w-3 h-3 mr-1" /> {m.theme}
                          </Badge>
                        ) : (
                          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Bot className="w-3.5 h-3.5 text-primary" /> HerSpace Companion
                          </span>
                        )}

                        {m.urgency && (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              URGENCY_STYLE[m.urgency]?.badgeCls || "bg-secondary text-foreground"
                            }`}
                          >
                            {URGENCY_STYLE[m.urgency]?.label || m.urgency}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        {/* Audio Speak Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleSpeak(m.id, m.content)}
                          className={`p-1.5 rounded-full transition-colors ${
                            speakingMessageId === m.id
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                          }`}
                          title={speakingMessageId === m.id ? "Stop voice narration" : "Listen to response"}
                        >
                          {speakingMessageId === m.id ? (
                            <VolumeX className="w-3.5 h-3.5" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Copy Button */}
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(m.id, m.content)}
                          className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                          title="Copy text"
                        >
                          {copiedId === m.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Main Message Text */}
                  <div className={`whitespace-pre-line leading-relaxed font-light ${m.role === "assistant" ? "font-serif text-sm sm:text-base text-foreground/95" : "text-primary-foreground"}`}>
                    {m.content}
                  </div>

                  {/* Discreet Safety Alert if danger detected */}
                  {m.dangerCheck && (
                    <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 space-y-3 animate-in fade-in">
                      <div className="flex items-center gap-2 text-destructive font-semibold text-xs uppercase tracking-wider">
                        <ShieldAlert className="w-4 h-4" /> Personal Safety In Situ
                      </div>
                      <p className="text-xs text-destructive-foreground font-medium leading-relaxed">
                        {m.dangerCheck}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSend("No, I am not in a safe space right now. I need immediate guidance.")}
                          className="rounded-full bg-destructive text-destructive-foreground hover:brightness-110 px-3.5 py-1 text-xs font-medium cursor-pointer shadow-2xs"
                        >
                          I am not safe
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSend("I am in a safe space for now.")}
                          className="rounded-full border border-border bg-card hover:bg-secondary/80 px-3.5 py-1 text-xs text-foreground cursor-pointer shadow-2xs"
                        >
                          I am safe right now
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Support Area Tags */}
                  {m.supportAreas && m.supportAreas.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mr-1">
                        Domains:
                      </span>
                      {m.supportAreas.map((a) => {
                        const info = AREA_LABEL[a] || { label: a, icon: "•" };
                        return (
                          <Badge
                            key={a}
                            variant="secondary"
                            className="rounded-full text-[10px] font-medium bg-secondary/70 border border-border/50 text-foreground/80 py-0.5"
                          >
                            <span className="mr-1">{info.icon}</span> {info.label}
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Next Steps Roadmap */}
                  {m.nextSteps && m.nextSteps.length > 0 && (
                    <div className="pt-3 border-t border-border/50 space-y-2.5">
                      <p className="text-[11px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5" /> Clear Step-by-Step Pathway
                      </p>
                      <div className="space-y-2">
                        {m.nextSteps.map((s, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 p-3 rounded-2xl bg-secondary/35 border border-border/60 text-xs"
                          >
                            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div className="space-y-0.5">
                              <p className="font-semibold text-foreground">{s.title}</p>
                              {s.detail && (
                                <p className="text-muted-foreground font-light leading-relaxed">{s.detail}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Verified Help & Resources Grid */}
                  {m.resources && m.resources.length > 0 && (
                    <div className="pt-3 border-t border-border/50 space-y-2.5">
                      <p className="text-[11px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5">
                        <HeartHandshake className="w-3.5 h-3.5" /> Verified Support &amp; Helplines
                      </p>
                      <div className="grid sm:grid-cols-2 gap-2.5">
                        {m.resources.map((r, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl border border-border/70 bg-card/90 shadow-2xs space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <p className="font-medium text-foreground">{r.name}</p>
                              <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                            </div>
                            <p className="text-muted-foreground font-light text-[11px]">{r.what}</p>
                            <div className="pt-1 border-t border-border/40 text-[11px] font-mono text-primary font-medium">
                              {r.how}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Document Checklist */}
                  {m.documentsToPrepare && m.documentsToPrepare.length > 0 && (
                    <div className="pt-3 border-t border-border/50 space-y-1.5">
                      <p className="text-[11px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> Recommended to Keep or Document:
                      </p>
                      <div className="grid sm:grid-cols-2 gap-1.5">
                        {m.documentsToPrepare.map((doc, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2 rounded-xl bg-secondary/30 border border-border/50 text-[11px] text-foreground/85"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{doc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-up Interactive Inquiries */}
                  {m.followUpQuestions && m.followUpQuestions.length > 0 && (
                    <div className="pt-3 border-t border-border/50 space-y-2">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 text-primary" /> Optional Inquiries to Explore:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {m.followUpQuestions.map((q, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setInput(q)}
                            className="rounded-full border border-border/80 bg-secondary/40 hover:bg-primary/10 hover:border-primary/40 text-foreground px-3 py-1 text-xs text-left transition-all cursor-pointer shadow-2xs"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reflection Prompt & Journal Bridge */}
                  {m.reflectionPrompt && (
                    <div className="pt-3 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-secondary/35 -mx-2 -mb-2 p-3.5 rounded-2xl border border-border/50">
                      <div className="space-y-0.5 max-w-lg">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          Journal Sanctuary Inquiry:
                        </p>
                        <p className="text-xs font-serif italic text-foreground leading-snug">
                          &ldquo;{m.reflectionPrompt}&rdquo;
                        </p>
                      </div>

                      {onSaveToJournal && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const entryText = `${m.reflectionPrompt}\n\nReflection from HerSpace:\n${m.content}`;
                            onSaveToJournal(entryText);
                            toast.success("Reflection loaded into Journal Writer!");
                          }}
                          className="rounded-full text-xs h-7.5 px-3.5 shrink-0 bg-background hover:bg-primary/10 hover:text-primary cursor-pointer border-border/70 shadow-2xs"
                        >
                          <BookHeart className="w-3.5 h-3.5 mr-1.5 text-primary" /> Send to Journal
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="flex justify-end pt-1">
                    <span className={`text-[10px] font-mono ${m.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Waiting Indicator */}
            {loading && (
              <div className="flex items-start gap-3.5 animate-in fade-in">
                <div className="w-9 h-9 rounded-2xl bg-primary/20 text-primary border border-primary/25 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquareHeart className="w-4 h-4 animate-pulse text-primary" />
                </div>
                <div className="p-4 sm:p-5 rounded-3xl rounded-tl-xs bg-background/80 border border-primary/20 shadow-md backdrop-blur-md text-xs sm:text-sm text-foreground flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                  </div>
                  <span className="font-serif italic text-muted-foreground">
                    HerSpace is holding space, listening tenderly and reflecting…
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Gentle Sanctuary Starting Topics (Only when conversation is fresh, NO graphic/specific examples) */}
          {messages.length <= 1 && (
            <div className="rounded-3xl border border-border/70 bg-card/70 p-4 sm:p-5 backdrop-blur-md space-y-2.5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Gentle Topics You May Explore:
                </p>
                <span className="text-[11px] text-muted-foreground font-light hidden sm:inline">
                  Click to start comfortably
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {GENTLE_TOPIC_PILLS.map((pill, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(pill.prompt)}
                    disabled={loading}
                    className="p-3 rounded-2xl border border-border/70 bg-background/80 hover:bg-secondary/70 hover:border-primary/40 text-foreground transition-all text-left flex items-center gap-2.5 shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <span className="text-base shrink-0">{pill.icon}</span>
                    <span className="text-xs font-medium truncate">{pill.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0 opacity-60" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================================
              ANIMATED REAL-TIME VOICE VISUALIZER BANNER
              ========================================================================= */}
          {isListening && (
            <div className="p-4 rounded-3xl bg-gradient-to-r from-primary/15 via-rose-500/10 to-primary/15 border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-primary shadow-lg animate-in fade-in">
              <div className="flex items-center gap-3">
                {/* 12-bar Pulsing Soundwave Visualizer */}
                <div className="flex items-center gap-1 h-6 px-1">
                  {[24, 12, 18, 22, 14, 20, 10, 24, 16, 22, 14, 18].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 bg-primary rounded-full animate-pulse"
                      style={{
                        height: `${h}px`,
                        animationDuration: `${0.4 + (i % 4) * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
                <div>
                  <p className="font-semibold text-foreground">Listening to your voice…</p>
                  <p className="text-[11px] text-muted-foreground">Speak gently in your own cadence</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={toggleVoiceTalk}
                  className="rounded-full text-xs h-8 px-4 cursor-pointer shadow-2xs"
                >
                  <MicOff className="w-3.5 h-3.5 mr-1.5" /> Finish Dictating
                </Button>
              </div>
            </div>
          )}

          {/* =========================================================================
              SANCTUARY INPUT DOCK
              ========================================================================= */}
          <div className="relative rounded-3xl border border-primary/20 bg-card/90 backdrop-blur-xl p-3 sm:p-4 shadow-xl space-y-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell HerSpace what is on your heart and mind, unconditionally…"
              rows={3}
              className="w-full bg-transparent border-0 resize-none text-xs sm:text-sm p-2 focus-visible:ring-0 leading-relaxed placeholder:text-muted-foreground/60"
            />

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/50 px-1">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Voice Input Button */}
                <Button
                  type="button"
                  variant={isListening ? "destructive" : "ghost"}
                  size="sm"
                  onClick={toggleVoiceTalk}
                  className={`rounded-full text-xs h-8 px-3.5 cursor-pointer transition-all ${
                    isListening
                      ? "animate-pulse"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/10 border border-border/60"
                  }`}
                  title={isListening ? "Stop listening" : "Voice dictation"}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-3.5 h-3.5 mr-1.5" /> Stop Dictating
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 mr-1.5 text-primary" /> Voice Input
                    </>
                  )}
                </Button>

                {/* Grounding Reminder Pill */}
                <button
                  type="button"
                  onClick={() => setShowBreathingAnchor(true)}
                  className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-secondary/60 cursor-pointer hidden sm:flex"
                >
                  <Wind className="w-3 h-3 text-primary" /> Need a breath first?
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground/70 hidden md:inline font-light">
                  Press Enter to send
                </span>

                <Button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className="rounded-full text-xs px-5 h-8.5 bg-primary text-primary-foreground hover:brightness-105 cursor-pointer shadow-xs disabled:opacity-40 transition-all"
                >
                  Send <Send className="w-3 h-3 ml-1.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
