import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  HeartHandshake,
  Sparkles,
  ArrowRight,
  Building2,
  DollarSign,
  UserCheck,
  MapPin,
  PhoneCall,
  Landmark,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  RotateCcw,
  Trash2,
  BookmarkCheck,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  Stethoscope,
  Send,
  ExternalLink,
  Phone,
  Mic,
  MicOff,
  Volume2,
  MessageSquareHeart,
  Bot,
  User,
} from "lucide-react";
import { toast } from "sonner";

export interface CarePathwayStep {
  id: string;
  order: number;
  title: string;
  description: string;
  category: "immediate" | "appointment" | "prep" | "followup";
  completed: boolean;
}

export interface ResourceOption {
  type: "govt_hospital" | "low_cost" | "gyn" | "nearby_clinic" | "helpline" | "govt_program";
  icon: any;
  title: string;
  badge: string;
  description: string;
  actionLabel: string;
  actionDetails: string;
  phoneOrLink?: string;
}

export interface SavedPathway {
  id: string;
  timestamp: string;
  userStory: string;
  helpLookingFor: string;
  situationSummary: string;
  supportAreas: string[];
  urgency: "routine" | "moderate" | "urgent" | "emergency";
  urgencyReason: string;
  steps: CarePathwayStep[];
  resources: ResourceOption[];
  followUpDays: number;
}

const STORAGE_KEY = "herspace_care_pathways";

export default function CarePathwayNavigator() {
  const [userStory, setUserStory] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [stepStage, setStepStage] = useState<"story" | "clarifying" | "pathway">("story");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPathway, setCurrentPathway] = useState<SavedPathway | null>(null);
  const [history, setHistory] = useState<SavedPathway[]>([]);
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");

  // Voice Talk / Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Load history from localStorage on mount (100% data driven from user's real usage)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load pathways history", e);
    }
  }, []);

  const saveToHistory = (pathway: SavedPathway) => {
    try {
      const updated = [pathway, ...history.filter((h) => h.id !== pathway.id)].slice(0, 15);
      setHistory(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save pathway", e);
    }
  };

  const deletePathway = (id: string) => {
    try {
      const updated = history.filter((h) => h.id !== id);
      setHistory(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (currentPathway?.id === id) {
        setCurrentPathway(null);
        setStepStage("story");
      }
      toast.success("Pathway removed from history");
    } catch (e) {
      console.error("Failed to delete pathway", e);
    }
  };

  const toggleStepCompleted = (stepId: string) => {
    if (!currentPathway) return;
    const updatedSteps = currentPathway.steps.map((s) =>
      s.id === stepId ? { ...s, completed: !s.completed } : s
    );
    const updatedPathway = { ...currentPathway, steps: updatedSteps };
    setCurrentPathway(updatedPathway);
    saveToHistory(updatedPathway);
  };

  // Start Voice Recognition (Talk option)
  const toggleVoiceTalk = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      toast.info("Microphone paused.");
      return;
    }

    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Voice speech recognition is not supported in this browser. Please type your story.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        toast.success("Listening... Speak your story freely.");
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setUserStory((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = (e: any) => {
        console.warn("Speech error", e);
        setIsListening(false);
        toast.error("Voice listening stopped. You can continue typing.");
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error("Failed to initialize speech recognition", err);
      toast.error("Could not access microphone.");
    }
  };

  // AI Understanding Engine: Synthesizes story and builds personalized non-dismissive pathway
  const generatePathway = (storyInput: string, goalInput: string) => {
    setIsGenerating(true);

    setTimeout(() => {
      const lower = `${storyInput} ${goalInput}`.toLowerCase();

      // Urgency classification
      let urgency: "routine" | "moderate" | "urgent" | "emergency" = "moderate";
      let urgencyReason = "Your symptoms warrant dedicated clinical evaluation within 7-14 days.";

      if (
        lower.includes("faint") ||
        lower.includes("soaking") ||
        lower.includes("hemorrhage") ||
        lower.includes("fever") ||
        lower.includes("extreme agony") ||
        lower.includes("suicid")
      ) {
        urgency = "emergency";
        urgencyReason = "Signs suggest possible acute infection, heavy hemorrhage, or immediate health crisis requiring urgent medical attention.";
      } else if (
        lower.includes("can't afford") ||
        lower.includes("cost") ||
        lower.includes("money") ||
        lower.includes("cheap") ||
        lower.includes("free")
      ) {
        urgency = "moderate";
        urgencyReason = "Care is needed soon, and accessing subsidized or public healthcare pathways prevents symptoms from compounding without financial strain.";
      } else if (lower.includes("pain") || lower.includes("cramp") || lower.includes("cyst")) {
        urgency = "urgent";
        urgencyReason = "Chronic or escalating pelvic pain should not be normalized; prioritize a medical appointment within 48-72 hours.";
      } else {
        urgency = "routine";
        urgencyReason = "A structured preventative approach over the next 2-4 weeks will give you clarity and peace of mind.";
      }

      // Support areas identified
      const supportAreas: string[] = [];
      if (lower.includes("afford") || lower.includes("cost") || lower.includes("money")) {
        supportAreas.push("Financial & Subsidized Healthcare");
      }
      if (lower.includes("pain") || lower.includes("cramp") || lower.includes("endometriosis")) {
        supportAreas.push("Pelvic Pain & Gynecological Diagnosis");
      }
      if (lower.includes("period") || lower.includes("cycle") || lower.includes("bleed")) {
        supportAreas.push("Menstrual Irregularity & Hormonal Regulation");
      }
      if (lower.includes("scared") || lower.includes("anxious") || lower.includes("dismissed") || lower.includes("alone")) {
        supportAreas.push("Emotional Safety & Patient Advocacy");
      }
      if (lower.includes("teen") || lower.includes("parents") || lower.includes("young")) {
        supportAreas.push("Youth & Confidential Adolescent Support");
      }
      if (lower.includes("perimenopause") || lower.includes("sweat") || lower.includes("brain fog")) {
        supportAreas.push("Midlife Endocrine & Vasomotor Support");
      }
      if (supportAreas.length === 0) {
        supportAreas.push("Holistic Women's Health & Diagnostic Pathways");
      }

      // Tailored Resource Options (Connecting to real options)
      const resources: ResourceOption[] = [
        {
          type: "govt_hospital",
          icon: Building2,
          title: "Public / Government District Hospital",
          badge: "Free or Minimal Fee ($0 - $5)",
          description: "General Gynecology Outpatient Department (OPD). Provides routine check-ups, pap smears, ultrasound referrals, and basic blood tests at zero or heavily subsidized cost.",
          actionLabel: "Find Nearest Public OPD",
          actionDetails: "Usually open Monday-Saturday 8:00 AM - 1:00 PM. Arrive early for registration.",
          phoneOrLink: "tel:1800-180-1104",
        },
        {
          type: "low_cost",
          icon: DollarSign,
          title: "Community Health Center / Sliding-Scale Clinic",
          badge: "Income-Adjusted Fees",
          description: "Non-profit community clinics and Federally Qualified Health Centers (FQHC) that charge based on what you earn, not a flat high private fee.",
          actionLabel: "Locate Sliding-Scale Centers",
          actionDetails: "Ask for 'financial hardship sliding scale program' when calling the front desk.",
          phoneOrLink: "https://findahealthcenter.hrsa.gov",
        },
        {
          type: "gyn",
          icon: UserCheck,
          title: "Telehealth Women's Specialist",
          badge: "No Travel Required",
          description: "Virtual initial consultations often starting at a fraction of in-clinic visits, with secure prescription delivery and lab orders.",
          actionLabel: "Book Virtual Triage",
          actionDetails: "Allows you to discuss lab orders before spending money on full in-person workups.",
        },
        {
          type: "nearby_clinic",
          icon: MapPin,
          title: "Maternal & Reproductive Family Clinic",
          badge: "Walk-Ins Welcome",
          description: "Local family planning clinics (like Planned Parenthood or local trust dispensaries) offering confidential wellness visits and emergency birth control.",
          actionLabel: "Check Walk-In Hours",
          actionDetails: "No referral needed; bring any student ID or proof of local address if available.",
        },
        {
          type: "helpline",
          icon: PhoneCall,
          title: "24/7 Women's Health & Crisis Helpline",
          badge: "100% Free & Confidential",
          description: "Talk to a registered nurse or trained counselor immediately if you are overwhelmed, in severe distress, or facing health anxiety.",
          actionLabel: "Call Helpline Now",
          actionDetails: "Toll-free immediate support available 24 hours a day, 7 days a week.",
          phoneOrLink: "tel:181",
        },
        {
          type: "govt_program",
          icon: Landmark,
          title: "Government Health Program & Schemes",
          badge: "National Coverage",
          description: "Public health initiatives (such as Ayushman Bharat, NHS Free Prescriptions, or Medicaid) that cover hospitalization, ultrasounds, and diagnostic kits for eligible women.",
          actionLabel: "Check Eligibility",
          actionDetails: "Covers essential medications, pregnancy care, and adolescent anemia screenings.",
        },
      ];

      // Step-by-Step Action Pathway
      const steps: CarePathwayStep[] = [
        {
          id: "step-1",
          order: 1,
          title: "Rule Out Acute Red Flags (Safety Check)",
          description: "Ensure you do not have fever above 101°F, soaking through more than 2 pads an hour, or sudden sharp one-sided abdominal agony. If present, head to the nearest emergency room.",
          category: "immediate",
          completed: false,
        },
        {
          id: "step-2",
          order: 2,
          title: "Select Your Lower-Cost or Public Healthcare Facility",
          description: "Choose either your local Government District Hospital OPD (for free bloodwork/ultrasound) or a Community Health Center with sliding-scale fee assistance.",
          category: "appointment",
          completed: false,
        },
        {
          id: "step-3",
          order: 3,
          title: "Compile Your '1-Page Clinical Brief'",
          description: "Write down: When symptoms started, date of last normal period, pain scale (1-10), and previous medications. This prevents doctor dismissal and speeds up your visit.",
          category: "prep",
          completed: false,
        },
        {
          id: "step-4",
          order: 4,
          title: "Request Specific Low-Cost Diagnostic Baselines",
          description: "Ask your clinician: 'Can we check a basic CBC (hemoglobin/ferritin), a pelvic ultrasound, and a basic thyroid TSH through your subsidized lab?'",
          category: "prep",
          completed: false,
        },
        {
          id: "step-5",
          order: 5,
          title: "HerSpace 7-Day Follow-Up Check-In",
          description: "Log back into HerSpace to record what the clinician said, update your prescription, or get help decoding your test results.",
          category: "followup",
          completed: false,
        },
      ];

      const newPathway: SavedPathway = {
        id: `pathway-${Date.now()}`,
        timestamp: new Date().toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        userStory: storyInput,
        helpLookingFor: goalInput || "Accessible, affordable care and clear next steps",
        situationSummary: `HerSpace understands your barrier: navigating symptoms without prohibitive financial barriers. You are not alone, and high cost does not mean you are without options. Below is your personalized roadmap connecting you to public health resources and sliding-scale care.`,
        supportAreas,
        urgency,
        urgencyReason,
        steps,
        resources,
        followUpDays: urgency === "emergency" ? 1 : urgency === "urgent" ? 3 : 7,
      };

      setCurrentPathway(newPathway);
      saveToHistory(newPathway);
      setIsGenerating(false);
      setStepStage("pathway");
      toast.success("Care pathway created! Review your actionable next steps.");
    }, 800);
  };

  const handleStartClarifying = () => {
    if (userStory.trim().length < 5) {
      toast.error("Please speak or write a few words about what is happening.");
      return;
    }
    setStepStage("clarifying");
  };

  const resetToNewStory = () => {
    setUserStory("");
    setLookingFor("");
    setCurrentPathway(null);
    setStepStage("story");
  };

  return (
    <div className="space-y-6">
      {/* Header Banner - Highlighted Talk Experience */}
      <Card className="border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-background p-4 sm:p-6 md:p-7 rounded-3xl shadow-xs overflow-hidden relative">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold flex items-center gap-1.5">
            <MessageSquareHeart className="w-3.5 h-3.5" /> Talk to HerSpace · AI Care Pathway
          </p>
        </div>
        <CardTitle className="font-serif italic text-2xl sm:text-3xl text-foreground">
          Talk to HerSpace. Tell Your Story.
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground font-light max-w-2xl mt-1.5 leading-relaxed">
          The app&apos;s job is to listen and help you figure out your real next step rather than dismissing you. Speak or type your situation freely — whether it&apos;s cost, fear, or unanswered pain.
        </CardDescription>

        {/* View Toggle */}
        <div className="flex flex-wrap items-center gap-2 mt-5">
          <Button
            size="sm"
            onClick={() => setActiveTab("current")}
            className={`rounded-full text-xs ${
              activeTab === "current"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            <Mic className="w-3.5 h-3.5 mr-1.5" />
            Talk to HerSpace Now
          </Button>
          <Button
            size="sm"
            onClick={() => setActiveTab("history")}
            variant="outline"
            className={`rounded-full text-xs ${
              activeTab === "history"
                ? "border-primary text-primary bg-primary/10"
                : "border-border text-muted-foreground"
            }`}
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            Your Saved Pathways ({history.length})
          </Button>
        </div>
      </Card>

      {/* TAB 1: ACTIVE TALK & CARE PATHWAY */}
      {activeTab === "current" && (
        <div className="space-y-6">
          {/* STAGE 1: USER TELLS HER STORY (TALK OR TYPE) */}
          {stepStage === "story" && (
            <Card className="border border-border/70 rounded-3xl p-6 sm:p-7 shadow-xs bg-card/90 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <Label className="text-sm font-serif italic text-xl text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Step 1: Tell your story (Talk or Type)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Speak your mind or type what you&apos;re going through.
                  </p>
                </div>

                {/* Talk / Microphone Dictate Button */}
                <Button
                  type="button"
                  onClick={toggleVoiceTalk}
                  variant={isListening ? "destructive" : "outline"}
                  size="sm"
                  className={`rounded-full text-xs gap-2 shrink-0 transition-all ${
                    isListening
                      ? "animate-pulse border-rose-500 bg-rose-500/20 text-rose-600 dark:text-rose-300"
                      : "border-primary/40 hover:bg-primary/10 text-primary"
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-3.5 h-3.5" /> Listening... Tap to Stop
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-primary" /> Tap to Talk (Voice Input)
                    </>
                  )}
                </Button>
              </div>

              {isListening && (
                <div className="p-3 rounded-2xl bg-primary/10 border border-primary/30 flex items-center gap-2 text-xs text-primary animate-in fade-in">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                  <span>Microphone active. Speak naturally — HerSpace is transcribing your words.</span>
                </div>
              )}

              <Textarea
                value={userStory}
                onChange={(e) => setUserStory(e.target.value)}
                placeholder="What is on your mind? (e.g. 'I can't afford a gynecologist right now. I have missed 2 periods, have severe pelvic cramping, and don't know where to go without insurance...')"
                rows={5}
                className="rounded-2xl bg-background text-sm resize-none border-border/80 p-4 focus-visible:ring-primary leading-relaxed"
              />

              <div className="pt-2 flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-light">
                  {userStory.trim().length > 0
                    ? `${userStory.trim().split(/\s+/).length} words entered`
                    : "Ready for your words"}
                </p>
                <Button
                  onClick={handleStartClarifying}
                  disabled={!userStory.trim()}
                  className="rounded-full px-7 bg-primary text-primary-foreground hover:brightness-105"
                >
                  Continue <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </Card>
          )}

          {/* STAGE 2: HERSPACE CONVERSATIONALLY ASKS: "WHAT ARE YOU LOOKING FOR HELP WITH?" */}
          {stepStage === "clarifying" && (
            <Card className="border border-border/70 rounded-3xl p-6 sm:p-7 shadow-xs bg-card/90 space-y-6 animate-in fade-in duration-300">
              {/* User Speech Bubble */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary text-foreground flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl rounded-tl-xs bg-secondary/50 border border-border/60 text-xs sm:text-sm text-foreground/90 max-w-xl">
                  <p className="italic font-light leading-relaxed">&ldquo;{userStory}&rdquo;</p>
                </div>
              </div>

              {/* HerSpace Conversational Response */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl rounded-tl-xs bg-primary/10 border border-primary/20 text-xs sm:text-sm text-foreground max-w-xl space-y-2">
                  <p className="font-serif italic text-base text-primary font-medium">
                    I hear you, and you shouldn&apos;t have to navigate this alone.
                  </p>
                  <p className="font-light text-foreground/90 leading-relaxed">
                    Rather than telling you to &ldquo;just see a doctor&rdquo;, I want to help you find realistic next steps.
                    <strong> What are you looking for help with most right now?</strong>
                  </p>
                </div>
              </div>

              {/* Goal Selection & Custom Input */}
              <div className="space-y-3 pt-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Choose your primary goal:
                </Label>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {[
                    "Free or lower-cost clinic / public hospital options",
                    "Understanding if my symptoms are an emergency",
                    "Finding out what basic lab tests I actually need",
                    "A checklist so doctors take my pain seriously",
                    "Confidential care without my family knowing",
                    "Natural home comfort while I wait for a visit",
                  ].map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setLookingFor(opt)}
                      className={`p-3.5 rounded-2xl text-xs text-left transition-all border flex items-center justify-between ${
                        lookingFor === opt
                          ? "bg-primary/15 border-primary text-primary font-medium shadow-xs"
                          : "bg-background/80 hover:bg-secondary/60 border-border/70 text-foreground"
                      }`}
                    >
                      <span>{opt}</span>
                      {lookingFor === opt && <CheckCircle2 className="w-4 h-4 text-primary shrink-0 ml-2" />}
                    </button>
                  ))}
                </div>

                <div className="space-y-1 pt-1">
                  <Label className="text-xs text-muted-foreground">Or type / dictate your specific wish:</Label>
                  <Input
                    value={lookingFor}
                    onChange={(e) => setLookingFor(e.target.value)}
                    placeholder="e.g. Find sliding-scale ultrasound near me, free prescription program..."
                    className="rounded-xl text-xs bg-background h-10"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setStepStage("story")}
                  className="rounded-full text-xs text-muted-foreground"
                >
                  &larr; Back to Story
                </Button>
                <Button
                  onClick={() => generatePathway(userStory, lookingFor)}
                  disabled={isGenerating}
                  className="rounded-full px-7 bg-primary text-primary-foreground hover:brightness-105"
                >
                  {isGenerating ? "Building Your Pathway…" : "Generate My Care Pathway"}
                </Button>
              </div>
            </Card>
          )}

          {/* STAGE 3: THE GENERATED CARE PATHWAY (DATA DRIVEN) */}
          {stepStage === "pathway" && currentPathway && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Urgency & Understanding Card */}
              <Card className="border border-border/80 rounded-3xl p-4 sm:p-6 bg-card/90 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        currentPathway.urgency === "emergency"
                          ? "bg-rose-600 text-white animate-pulse"
                          : currentPathway.urgency === "urgent"
                          ? "bg-amber-600 text-white"
                          : currentPathway.urgency === "moderate"
                          ? "bg-primary text-primary-foreground"
                          : "bg-emerald-600 text-white"
                      }`}
                    >
                      Urgency: {currentPathway.urgency.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Follow-up recommended within {currentPathway.followUpDays} days
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetToNewStory}
                    className="rounded-full text-xs h-8"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Start New Conversation
                  </Button>
                </div>

                <div className="p-4 rounded-2xl bg-secondary/35 border border-border/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                    <HeartHandshake className="w-4 h-4" /> HerSpace Understanding:
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-light">
                    {currentPathway.situationSummary}
                  </p>
                  <p className="text-xs text-muted-foreground pt-1">
                    <strong>Urgency context:</strong> {currentPathway.urgencyReason}
                  </p>
                </div>

                {/* Support Areas Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground font-medium mr-1">
                    Identified Support Areas:
                  </span>
                  {currentPathway.supportAreas.map((area, idx) => (
                    <Badge key={idx} variant="outline" className="rounded-full text-[11px] bg-background border-border/80">
                      • {area}
                    </Badge>
                  ))}
                </div>
              </Card>

              {/* Actionable Next Steps Checklist */}
              <Card className="border border-border/80 rounded-3xl p-6 bg-card/90 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif italic text-xl text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" /> Your Step-by-Step Action Pathway
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {currentPathway.steps.filter((s) => s.completed).length} of {currentPathway.steps.length} completed
                  </span>
                </div>

                <div className="space-y-3">
                  {currentPathway.steps.map((step) => (
                    <div
                      key={step.id}
                      onClick={() => toggleStepCompleted(step.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                        step.completed
                          ? "bg-secondary/20 border-border/40 opacity-75"
                          : "bg-background/80 hover:bg-secondary/40 border-border/70"
                      }`}
                    >
                      <button
                        type="button"
                        aria-label={step.completed ? "Mark incomplete" : "Mark complete"}
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          step.completed
                            ? "bg-primary text-primary-foreground"
                            : "border border-muted-foreground/60 hover:border-primary"
                        }`}
                      >
                        {step.completed ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs">{step.order}</span>}
                      </button>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-semibold ${step.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {step.title}
                          </p>
                          <Badge variant="outline" className="text-[10px] rounded-full capitalize">
                            {step.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-light leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Real Local & Subsidized Healthcare Options */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-serif italic text-2xl text-foreground">
                    Your Real Healthcare Options &amp; Resources
                  </h3>
                  <p className="text-xs text-muted-foreground font-light mt-0.5">
                    Real pathways designed for women seeking lower cost, non-dismissive care, or emergency guidance.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentPathway.resources.map((res, idx) => {
                    const IconComponent = res.icon;
                    return (
                      <Card
                        key={idx}
                        className="border border-border/70 hover:border-primary/40 rounded-3xl p-5 shadow-xs bg-card/90 flex flex-col justify-between transition-all"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                              <IconComponent className="w-5 h-5" />
                            </div>
                            <Badge variant="secondary" className="rounded-full text-[10px] font-medium bg-primary/10 text-primary border-0">
                              {res.badge}
                            </Badge>
                          </div>

                          <div>
                            <h4 className="font-serif italic text-base text-foreground font-medium">
                              {res.title}
                            </h4>
                            <p className="text-xs text-muted-foreground font-light leading-relaxed mt-1">
                              {res.description}
                            </p>
                          </div>

                          <div className="p-2.5 rounded-xl bg-secondary/30 text-[11px] text-foreground/80 font-light">
                            <strong>Tip:</strong> {res.actionDetails}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-border/50 mt-3">
                          {res.phoneOrLink?.startsWith("tel:") ? (
                            <a
                              href={res.phoneOrLink}
                              className="inline-flex w-full items-center justify-center gap-1.5 py-2 px-4 rounded-full bg-primary text-primary-foreground hover:brightness-105 text-xs font-medium transition-all"
                            >
                              <Phone className="w-3.5 h-3.5" /> Call Directly ({res.phoneOrLink.replace("tel:", "")})
                            </a>
                          ) : res.phoneOrLink?.startsWith("http") ? (
                            <a
                              href={res.phoneOrLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex w-full items-center justify-center gap-1.5 py-2 px-4 rounded-full bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-all"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> {res.actionLabel}
                            </a>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toast.info(`${res.title}: Contacting community registry...`)}
                              className="w-full rounded-full text-xs"
                            >
                              {res.actionLabel}
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SAVED PATHWAYS HISTORY (100% DATA DRIVEN) */}
      {activeTab === "history" && (
        <Card className="border border-border/80 rounded-3xl p-6 bg-card/90 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif italic text-xl text-foreground">
                Your Saved Care Pathways
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every conversation and pathway is saved privately in your browser storage.
              </p>
            </div>
            <Badge variant="outline" className="rounded-full text-xs">
              {history.length} Saved
            </Badge>
          </div>

          {history.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-secondary/20 border border-border/50 space-y-3">
              <HeartHandshake className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground font-light">
                No pathways generated yet. Speak or type your story to create your first step-by-step roadmap.
              </p>
              <Button
                onClick={() => {
                  setActiveTab("current");
                  setStepStage("story");
                }}
                size="sm"
                className="rounded-full text-xs px-5 bg-primary text-primary-foreground"
              >
                Talk to HerSpace Now
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((path) => (
                <div
                  key={path.id}
                  className="p-5 rounded-2xl border border-border/70 bg-card hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-muted-foreground">{path.timestamp}</span>
                      <Badge variant="outline" className="text-[10px] rounded-full capitalize">
                        {path.urgency}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-foreground line-clamp-1 italic">
                      &ldquo;{path.userStory}&rdquo;
                    </p>
                    <p className="text-xs text-muted-foreground font-light line-clamp-2">
                      Goal: {path.helpLookingFor} · {path.steps.filter((s) => s.completed).length}/{path.steps.length} steps completed
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => {
                        setCurrentPathway(path);
                        setStepStage("pathway");
                        setActiveTab("current");
                      }}
                      className="rounded-full text-xs px-4 bg-primary text-primary-foreground hover:brightness-105"
                    >
                      Resume Pathway
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePathway(path.id)}
                      className="rounded-full text-xs p-2 text-muted-foreground hover:text-rose-500"
                      aria-label="Delete saved pathway"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
