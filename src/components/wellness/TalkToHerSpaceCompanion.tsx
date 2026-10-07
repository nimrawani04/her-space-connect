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

const URGENCY_STYLE: Record<string, { label: string; cls: string }> = {
  emergency: { label: "Emergency — get help now", cls: "bg-destructive text-destructive-foreground" },
  urgent: { label: "Urgent — act in the next day or two", cls: "bg-destructive/15 text-destructive border border-destructive/30" },
  soon: { label: "Worth acting on soon", cls: "bg-primary/15 text-primary border border-primary/30" },
  routine: { label: "No immediate danger detected", cls: "bg-secondary text-foreground border border-border" },
};
const AREA_LABEL: Record<string, string> = {
  safety: "Safety", health: "Health", mental_wellbeing: "Emotional support", legal: "Legal",
  workplace_or_education: "Work / university", financial: "Financial", relationships: "Relationships",
  reproductive: "Reproductive health", housing: "Housing", other: "Other",
};

interface TalkToHerSpaceCompanionProps {
  onSaveToJournal?: (reflectionText: string) => void;
}

const CONVERSATION_STARTERS = [
  "My boyfriend is threatening me and I'm scared",
  "I've been having severe period pain but can't afford a private gynecologist",
  "I reported harassment at my university but nobody is taking me seriously",
  "Someone keeps following me on my way home",
  "I'm completely burned out and can't stop crying",
  "My employer hasn't paid me for two months",
];

export function TalkToHerSpaceCompanion({ onSaveToJournal }: TalkToHerSpaceCompanionProps) {
  const chatFn = useServerFn(tellHerSpace);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Tell me what's happening, in your own words. You don't need to know whether it's a health, safety, legal, money or emotional problem — I'll help work that out, check whether anything is urgent, and guide you to your next step and real help.\n\nNothing is saved unless you choose to.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showCarePathway, setShowCarePathway] = useState(false);
  const [activeGrounding, setActiveGrounding] = useState<{
    name: string;
    instructions: string[];
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Voice speech-to-text
  const toggleVoiceTalk = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser. Please type your message.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("Listening... Speak gently to HerSpace");
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript.trim()) {
          setInput((prev) => (prev ? `${prev} ${currentTranscript.trim()}` : currentTranscript.trim()));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech recognition failed:", err);
      setIsListening(false);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || loading) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
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
      // Build history for backend LLM
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
      toast.error(error instanceof Error ? error.message : "Could not send message right now. Please try again.");
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
    setMessages([
      {
        id: "welcome-new",
        role: "assistant",
        content:
          "I'm here whenever you're ready to share. How can I support you right now?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setActiveGrounding(null);
    setShowCarePathway(false);
    toast.info("Started fresh conversation");
  };

  return (
    <div className="space-y-6">
      {/* Header Sanctuary Banner */}
      <Card className="border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-background p-4 sm:p-6 md:p-7 rounded-3xl shadow-xs overflow-hidden relative">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold flex items-center gap-1.5">
              <MessageSquareHeart className="w-3.5 h-3.5" /> Tell HerSpace
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCarePathway(!showCarePathway)}
              className="rounded-full text-xs h-8 border-border/80 hover:bg-secondary/60 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 mr-1.5 text-primary" />
              {showCarePathway ? "Back to Wellness Companion" : "Clinical & Clinic Pathway"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="rounded-full text-xs h-8 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Clear
            </Button>
          </div>
        </div>

        <CardTitle className="font-serif italic text-2xl sm:text-3xl text-foreground">
          {showCarePathway
            ? "Healthcare & Subsidized Clinic Navigator"
            : "Tell HerSpace what's happening."}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground font-light max-w-2xl mt-1.5 leading-relaxed">
          {showCarePathway
            ? "Dedicated guidance to locate sliding-scale centers, public hospital OPDs, and doctor prep checklists."
            : "Describe it in your own words. HerSpace checks for urgency, works out what kind of help fits, and guides you to your next step and real support. Not a replacement for a doctor, lawyer or emergency services."}
        </CardDescription>
      </Card>

      {/* RENDER CARE PATHWAY IF EXPLICITLY REQUESTED */}
      {showCarePathway ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40 border border-border/70 text-xs text-muted-foreground">
            <span>Viewing specific Healthcare Clinic &amp; Cost Navigation tool.</span>
            <button
              onClick={() => setShowCarePathway(false)}
              className="text-primary font-medium hover:underline flex items-center gap-1"
            >
              Return to conversational mental wellness &rarr;
            </button>
          </div>
          <CarePathwayNavigator />
        </div>
      ) : (
        /* MAIN INTERACTIVE CHAT COMPANION */
        <div className="space-y-4">
          {/* Conversation Starters (Chips) */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> For example:
            </p>
            <div className="flex flex-wrap gap-2">
              {CONVERSATION_STARTERS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  disabled={loading}
                  className="px-3.5 py-1.5 rounded-full text-xs border border-border/80 bg-card hover:bg-secondary/60 hover:border-primary/40 text-foreground/90 transition-all text-left shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Active Grounding Drawer/Widget (if triggered) */}
          {activeGrounding && (
            <Card className="rounded-3xl border border-primary/30 bg-primary/5 p-5 shadow-xs space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
                  <Wind className="w-4 h-4" /> Grounding Anchor: {activeGrounding.name}
                </div>
                <button
                  onClick={() => setActiveGrounding(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Dismiss
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 pt-1">
                {activeGrounding.instructions.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-card border border-border/70 flex items-start gap-2.5 text-xs text-foreground/90"
                  >
                    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center font-mono text-[10px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Chat Messages Log */}
          <Card className="rounded-3xl border border-border/80 bg-card/85 backdrop-blur-md shadow-xs p-4 sm:p-6 space-y-5 min-h-[420px] max-h-[640px] overflow-y-auto">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    m.role === "user"
                      ? "bg-secondary text-foreground"
                      : "bg-primary/20 text-primary"
                  }`}
                >
                  {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`space-y-3 max-w-xl sm:max-w-2xl rounded-2xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-xs shadow-xs"
                      : "bg-secondary/40 border border-border/70 text-foreground rounded-tl-xs shadow-2xs"
                  }`}
                >
                  {m.theme && (
                    <Badge
                      variant="outline"
                      className="rounded-full text-[10px] bg-primary/10 text-primary border-primary/20 mb-1"
                    >
                      {m.theme}
                    </Badge>
                  )}

                  <div className="whitespace-pre-line font-light space-y-2">
                    {m.content}
                  </div>

                  {/* Actions / Next Steps Checklist from HerSpace */}
                          {m.urgency && (
                    <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${URGENCY_STYLE[m.urgency].cls}`}>
                      {URGENCY_STYLE[m.urgency].label}
                    </div>
                  )}
                  {m.dangerCheck && (
                    <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs space-y-2">
                      <p className="font-semibold text-destructive">{m.dangerCheck}</p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => handleSend("No, I am not safe right now.")} className="rounded-full bg-destructive text-destructive-foreground px-3 py-1">I'm not safe</button>
                        <button type="button" onClick={() => handleSend("I'm safe for now.")} className="rounded-full border border-border bg-card px-3 py-1">I'm safe for now</button>
                      </div>
                    </div>
                  )}
                  {m.supportAreas && m.supportAreas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.supportAreas.map((a) => (
                        <Badge key={a} variant="outline" className="rounded-full text-[10px]">{AREA_LABEL[a] ?? a}</Badge>
                      ))}
                    </div>
                  )}
          {m.suggestedActions && m.suggestedActions.length > 0 && (
                    <div className="pt-2 border-t border-border/50 space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Gentle Self-Care Steps:
                      </p>
                      <ul className="space-y-1 text-xs text-foreground/85">
                        {m.suggestedActions.map((act, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {m.nextSteps && m.nextSteps.length > 0 && (
                    <div className="pt-2 border-t border-border/50 space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" /> Your next steps
                      </p>
                      <ol className="space-y-1.5 text-xs">
                        {m.nextSteps.map((s, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] flex items-center justify-center shrink-0">{i + 1}</span>
                            <span><strong className="font-medium">{s.title}</strong>{s.detail ? ` — ${s.detail}` : ""}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {m.resources && m.resources.length > 0 && (
                    <div className="pt-2 border-t border-border/50 space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1">
                        <HeartHandshake className="w-3 h-3" /> Where to get real help
                      </p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {m.resources.map((r, i) => (
                          <div key={i} className="rounded-xl border border-border/70 bg-card p-2.5 text-xs">
                            <p className="font-medium">{r.name}</p>
                            <p className="text-muted-foreground">{r.what}</p>
                            <p className="mt-1">{r.how}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {m.documentsToPrepare && m.documentsToPrepare.length > 0 && (
                    <div className="pt-2 border-t border-border/50 space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">Things to write down or gather</p>
                      <ul className="list-disc pl-4 text-xs space-y-0.5">
                        {m.documentsToPrepare.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  )}
                  {m.followUpQuestions && m.followUpQuestions.length > 0 && (
                    <div className="pt-2 border-t border-border/50 space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">To guide you better, tell me:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {m.followUpQuestions.map((q, i) => (
                          <button key={i} type="button" onClick={() => setInput(q + " ")} className="rounded-full border border-border bg-card px-3 py-1 text-xs hover:border-primary/40">{q}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reflection Prompt + Send to Journal Button */}
                  {m.reflectionPrompt && (
                    <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-secondary/30 -mx-2 -mb-2 p-2.5 rounded-xl">
                      <div className="space-y-0.5">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          Journal Inquiry:
                        </p>
                        <p className="text-xs font-serif italic text-foreground">
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
                            toast.success("Loaded into Journal Writer!");
                          }}
                          className="rounded-full text-[11px] h-7 px-3 shrink-0 bg-background hover:bg-primary/10 hover:text-primary cursor-pointer border-border/70"
                        >
                          <BookHeart className="w-3 h-3 mr-1 text-primary" /> Send to Journal
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <span className="text-[10px] opacity-60 font-mono">
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl rounded-tl-xs bg-secondary/40 border border-border/70 text-xs text-muted-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                  <span className="font-light italic">HerSpace is listening and reflecting…</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </Card>

          {/* Voice active listening banner */}
          {isListening && (
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-between gap-2 text-xs text-primary animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
                <span>Microphone active. HerSpace is transcribing your speech…</span>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={toggleVoiceTalk}
                className="rounded-full text-xs h-7 px-3"
              >
                Stop Listening
              </Button>
            </div>
          )}

          {/* Input Box & Voice Button */}
          <div className="relative rounded-3xl border border-border/80 bg-card p-2 sm:p-3 shadow-xs space-y-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell HerSpace what's going on, in your own words…"
              rows={3}
              className="w-full bg-transparent border-0 resize-none text-xs sm:text-sm p-2 focus-visible:ring-0 leading-relaxed placeholder:text-muted-foreground/70"
            />

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50 px-1">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={isListening ? "destructive" : "ghost"}
                  size="sm"
                  onClick={toggleVoiceTalk}
                  className={`rounded-full text-xs h-8 px-3 cursor-pointer ${
                    isListening
                      ? "animate-pulse"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                  }`}
                  title={isListening ? "Stop listening" : "Voice dictation"}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-3.5 h-3.5 mr-1" /> Listening…
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 mr-1 text-primary" /> Voice Input
                    </>
                  )}
                </Button>

                <span className="text-[11px] text-muted-foreground hidden sm:inline">
                  Press Enter to send · Shift+Enter for new line
                </span>
              </div>

              <Button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="rounded-full text-xs px-5 h-8 bg-primary text-primary-foreground hover:brightness-105 cursor-pointer disabled:opacity-50"
              >
                Send <Send className="w-3 h-3 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
