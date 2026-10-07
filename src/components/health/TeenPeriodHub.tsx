import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Heart,
  Sparkles,
  Calendar,
  CheckCircle2,
  HelpCircle,
  Package,
  BookOpen,
  MessageCircle,
  Smile,
  ShieldCheck,
  Check,
  Plus,
  Flame,
  Coffee,
} from "lucide-react";
import { toast } from "sonner";

const TEEN_STORAGE_KEY = "herspace_teen_profile";

type TeenProfile = {
  hasStarted: boolean;
  firstPeriodDate?: string;
  ageAtMenarche?: string;
  cycleLengthDays?: number;
  pubertySigns: string[];
  kitItems: string[];
};

const DEFAULT_KIT_ITEMS = [
  "2 Regular pads with wings (individually wrapped)",
  "1 Pair of spare clean underwear in a small pouch",
  "1 Small ziplock bag (for discreet disposal or laundry)",
  "Pocket-sized pack of gentle cleansing wipes",
  "Pain relief approved by parent/guardian (e.g. Ibuprofen)",
  "A small chocolate or favorite calming treat",
];

const PUBERTY_SIGNS = [
  { id: "growth", label: "Sudden growth spurt in height", timeline: "Typically begins first (~age 9-11)" },
  { id: "breasts", label: "Breast development / tenderness", timeline: "Begins 2 to 2.5 years before first period" },
  { id: "hair", label: "Underarm and pubic hair growth", timeline: "Appears alongside breast changes" },
  { id: "discharge", label: "Clear or milky white vaginal discharge", timeline: "Usually signals your period is 6-12 months away!" },
  { id: "skin", label: "Skin oiliness or occasional pimples", timeline: "From awakening hormone receptors" },
  { id: "mood", label: "Stronger emotional waves & empathy", timeline: "Brain remodeling and hormone surges" },
];

export function TeenPeriodHub() {
  const [profile, setProfile] = useState<TeenProfile>(() => {
    try {
      const saved = localStorage.getItem(TEEN_STORAGE_KEY);
      return saved
        ? JSON.parse(saved)
        : {
            hasStarted: false,
            pubertySigns: ["breasts", "discharge"],
            kitItems: [DEFAULT_KIT_ITEMS[0], DEFAULT_KIT_ITEMS[1], DEFAULT_KIT_ITEMS[2]],
          };
    } catch {
      return {
        hasStarted: false,
        pubertySigns: ["breasts", "discharge"],
        kitItems: [DEFAULT_KIT_ITEMS[0], DEFAULT_KIT_ITEMS[1], DEFAULT_KIT_ITEMS[2]],
      };
    }
  });

  const [activeTab, setActiveTab] = useState("tracker");

  // Save changes
  useEffect(() => {
    try {
      localStorage.setItem(TEEN_STORAGE_KEY, JSON.stringify(profile));
    } catch {}
  }, [profile]);

  function togglePubertySign(id: string) {
    setProfile((prev) => {
      const has = prev.pubertySigns.includes(id);
      return {
        ...prev,
        pubertySigns: has ? prev.pubertySigns.filter((x) => x !== id) : [...prev.pubertySigns, id],
      };
    });
  }

  function toggleKitItem(item: string) {
    setProfile((prev) => {
      const has = prev.kitItems.includes(item);
      return {
        ...prev,
        kitItems: has ? prev.kitItems.filter((x) => x !== item) : [...prev.kitItems, item],
      };
    });
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-pink-500/15 via-purple-500/10 to-primary/10 border border-pink-500/25 p-6 sm:p-8 backdrop-blur-md shadow-xs overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
          <p className="text-xs uppercase tracking-[0.2em] text-pink-700 dark:text-pink-300 font-semibold">
            First Period &amp; Puberty Sanctuary · For Younger Sisters
          </p>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-serif italic text-foreground tracking-tight">
              Teen &amp; First Period Guide
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed font-light">
              Zero shame, zero confusion. Everything you need to understand your changing body, prepare an emergency kit, and feel confident about your first period.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-card/90 border border-border/80 px-4 py-3 rounded-2xl shrink-0">
            <Heart className="w-5 h-5 text-pink-500" />
            <div className="text-left">
              <p className="text-xs font-semibold text-foreground">You are in control</p>
              <p className="text-[10px] text-muted-foreground">Private, friendly &amp; safe space</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto pb-1 scrollbar-none">
          <TabsList className="bg-card/90 border border-border/80 p-1 rounded-full backdrop-blur-md">
            <TabsTrigger value="tracker" className="rounded-full px-4 py-1.5 text-xs gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> First Period Tracker
            </TabsTrigger>
            <TabsTrigger value="education" className="rounded-full px-4 py-1.5 text-xs gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Period Basics 101
            </TabsTrigger>
            <TabsTrigger value="puberty" className="rounded-full px-4 py-1.5 text-xs gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Puberty Body Map
            </TabsTrigger>
            <TabsTrigger value="kit" className="rounded-full px-4 py-1.5 text-xs gap-1.5">
              <Package className="w-3.5 h-3.5" /> Emergency Kit Checklist
            </TabsTrigger>
            <TabsTrigger value="scripts" className="rounded-full px-4 py-1.5 text-xs gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" /> How to Talk About It
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: TRACKER */}
        <TabsContent value="tracker" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Status Card */}
            <Card className="rounded-3xl border border-border/80 bg-card/90 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="font-serif italic text-xl">Has your first period arrived yet?</CardTitle>
                <CardDescription className="text-xs">
                  Whether you are waiting for day one or navigating your first year, we have you covered.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/40 border border-border/60">
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      {profile.hasStarted ? "Yes, my period has started" : "Not yet — I'm preparing and tracking changes"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {profile.hasStarted ? "Track your cycle rhythm" : "Check readiness signs below"}
                    </p>
                  </div>
                  <Switch
                    checked={profile.hasStarted}
                    onCheckedChange={(val) => {
                      setProfile((p) => ({ ...p, hasStarted: val }));
                      toast.info(val ? "Awesome! First period mode enabled." : "Preparation mode enabled.");
                    }}
                  />
                </div>

                {profile.hasStarted ? (
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">When was your first period?</Label>
                      <Input
                        type="date"
                        value={profile.firstPeriodDate || ""}
                        onChange={(e) => setProfile((p) => ({ ...p, firstPeriodDate: e.target.value }))}
                        className="rounded-xl text-xs h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Your age when it started</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 12 or 13"
                        value={profile.ageAtMenarche || ""}
                        onChange={(e) => setProfile((p) => ({ ...p, ageAtMenarche: e.target.value }))}
                        className="rounded-xl text-xs h-9"
                      />
                    </div>
                    <div className="p-3.5 rounded-2xl bg-pink-500/10 border border-pink-500/30 text-xs text-pink-900 dark:text-pink-200 space-y-1">
                      <p className="font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-pink-600" /> Normal Teen Cycle Rule:
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        In the first 1 to 2 years after your first period, it is completely normal to have irregular cycles (anywhere from 21 to 45 days apart, or even skipping a month). Your brain and ovaries are learning to communicate!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Most girls get their first period between ages 10 and 15 (the average age is 12). If you notice white discharge on your underwear, your period usually arrives within the next 6 to 12 months!
                    </p>
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-200">
                      <p className="font-semibold">You are right on track!</p>
                      <p className="text-[11px] mt-0.5">Explore the Puberty Body Map and pack your emergency kit so you feel 100% prepared whenever it happens.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Puberty Milestones Check */}
            <Card className="rounded-3xl border border-border/80 bg-card/90 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="font-serif italic text-xl">Your Puberty Clues</CardTitle>
                <CardDescription className="text-xs">
                  Tap any body changes you have noticed so far to see where you are on the journey.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {PUBERTY_SIGNS.map((sign) => {
                  const checked = profile.pubertySigns.includes(sign.id);
                  return (
                    <button
                      key={sign.id}
                      type="button"
                      onClick={() => togglePubertySign(sign.id)}
                      className={`w-full p-2.5 rounded-2xl border text-left transition-all duration-200 flex items-start gap-2.5 cursor-pointer ${
                        checked
                          ? "bg-pink-500/10 border-pink-500/40 text-foreground"
                          : "bg-secondary/30 border-border/60 text-muted-foreground hover:bg-secondary/60"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          checked ? "bg-pink-500 border-pink-500 text-white" : "border-border"
                        }`}
                      >
                        {checked && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <div className="text-xs space-y-0.5">
                        <p className={`font-medium ${checked ? "text-foreground font-semibold" : ""}`}>{sign.label}</p>
                        <p className="text-[10px] text-muted-foreground">{sign.timeline}</p>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: EDUCATION BASICS */}
        <TabsContent value="education" className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Card className="rounded-3xl border border-border/80 bg-card/90 p-5 space-y-3">
              <div className="w-9 h-9 rounded-2xl bg-pink-500/10 text-pink-600 flex items-center justify-center font-bold">
                01
              </div>
              <h3 className="font-serif italic text-lg text-foreground font-semibold">What is a period, really?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Each month, your uterus builds up a plush, soft inner lining of blood and nutrients. If an egg isn’t fertilized, your body gently lets that lining go. It exits through your vagina as a few tablespoons of blood over 3 to 7 days.
              </p>
            </Card>

            <Card className="rounded-3xl border border-border/80 bg-card/90 p-5 space-y-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                02
              </div>
              <h3 className="font-serif italic text-lg text-foreground font-semibold">Will it hurt? Handling cramps</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cramps happen when the uterine muscle contracts gently to release the lining. Warmth is your best friend: a warm heating pad, hot bath, ginger tea, or gentle hip circles relax the muscles instantly.
              </p>
            </Card>

            <Card className="rounded-3xl border border-border/80 bg-card/90 p-5 space-y-3">
              <div className="w-9 h-9 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                03
              </div>
              <h3 className="font-serif italic text-lg text-foreground font-semibold">Period products explained</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Pads:</strong> Stick into your underwear to absorb flow. Easiest for beginners!<br />
                <strong>Period underwear:</strong> Look and feel like regular cute underwear with built-in leak protection.<br />
                <strong>Tampons:</strong> Worn inside the vagina. Great for sports or swimming once you feel ready.
              </p>
            </Card>

            <Card className="rounded-3xl border border-border/80 bg-card/90 p-5 space-y-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                04
              </div>
              <h3 className="font-serif italic text-lg text-foreground font-semibold">What color is normal?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Period blood ranges from bright red (fast flow) to brown or dark burgundy (older blood that took longer to leave the uterus). Both are completely healthy and normal!
              </p>
            </Card>

            <Card className="rounded-3xl border border-border/80 bg-card/90 p-5 space-y-3">
              <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                05
              </div>
              <h3 className="font-serif italic text-lg text-foreground font-semibold">What if it starts at school?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Don’t panic! Wrap toilet paper into your underwear, walk calmly to the school nurse, or ask a female friend or teacher for a pad. Almost every woman has experienced this, and adults are always ready to help.
              </p>
            </Card>

            <Card className="rounded-3xl border border-border/80 bg-card/90 p-5 space-y-3">
              <div className="w-9 h-9 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                06
              </div>
              <h3 className="font-serif italic text-lg text-foreground font-semibold">When to see a doctor</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Talk to a doctor if: your period lasts longer than 8 days, you soak through a heavy pad in 1 to 2 hours, or pain keeps you from attending school even after taking pain relief.
              </p>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: PUBERTY BODY MAP */}
        <TabsContent value="puberty" className="space-y-4">
          <Card className="rounded-3xl border border-border/80 bg-card/90 p-6 space-y-4">
            <h3 className="font-serif italic text-2xl text-foreground">Your Changing Body: Step by Step</h3>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Puberty doesn’t happen overnight — it unfolds over 3 to 5 years. Here is what is happening under the hood:
            </p>

            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-secondary/35 border border-border/60 space-y-2">
                <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500" /> Step 1: The Ovaries Wake Up
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your brain sends chemical messengers (LH and FSH) to your ovaries. The ovaries begin producing estrogen, triggering your growth spurt and the start of breast buds (small, tender lumps under the nipples).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-secondary/35 border border-border/60 space-y-2">
                <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Step 2: Body Hair &amp; Oiliness
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Hormones stimulate sweat glands and hair follicles. Soft hair appears on your pubic area and underarms, and your skin might produce more natural oils. Washing with a gentle cleanser keeps pores happy.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-secondary/35 border border-border/60 space-y-2">
                <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Step 3: Vaginal Discharge
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You will notice white or clear moisture in your underwear. This is your vagina cleaning and protecting itself! It is completely normal, healthy, and a huge sign your first period is near.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-secondary/35 border border-border/60 space-y-2">
                <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Step 4: Menarche (First Period)
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your uterine lining matures and sheds for the first time. It might be light brown spotting or light red bleeding. Celebrate this moment — your body is doing something amazing!
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 4: EMERGENCY KIT CHECKLIST */}
        <TabsContent value="kit" className="space-y-4">
          <Card className="rounded-3xl border border-border/80 bg-card/90 p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-serif italic text-2xl text-foreground">School Backpack Period Kit</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pack these items in a small cute makeup pouch to keep in your school bag. You’ll never have to worry!
                </p>
              </div>
              <Badge variant="outline" className="text-xs rounded-full bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/30">
                {profile.kitItems.length} of {DEFAULT_KIT_ITEMS.length} packed
              </Badge>
            </div>

            <div className="space-y-2.5 pt-2">
              {DEFAULT_KIT_ITEMS.map((item, idx) => {
                const isPacked = profile.kitItems.includes(item);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleKitItem(item)}
                    className={`w-full p-3 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer ${
                      isPacked
                        ? "bg-pink-500/10 border-pink-500/35 text-foreground"
                        : "bg-secondary/35 border-border/60 text-muted-foreground hover:bg-secondary/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isPacked ? "bg-pink-500 border-pink-500 text-white" : "border-border"
                        }`}
                      >
                        {isPacked && <Check className="w-3 h-3" />}
                      </div>
                      <span className={`text-xs ${isPacked ? "font-semibold text-foreground line-through opacity-85" : "font-medium"}`}>
                        {item}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0 font-normal">
                      {isPacked ? "Packed ✓" : "To pack"}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        {/* TAB 5: HOW TO TALK ABOUT IT */}
        <TabsContent value="scripts" className="space-y-4">
          <Card className="rounded-3xl border border-border/80 bg-card/90 p-6 space-y-5">
            <div>
              <h3 className="font-serif italic text-2xl text-foreground">Comfortable Scripts for Big Moments</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Not sure what to say? Use these gentle, simple words when talking to someone:
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-secondary/35 border border-border/60 space-y-1.5">
                <p className="font-semibold text-primary">To your mom, dad, or guardian:</p>
                <div className="p-3 rounded-xl bg-card border border-border/70 text-foreground italic">
                  &ldquo;Hey, I think my period started today. Can you help me get some pads and show me what to do?&rdquo;
                </div>
                <p className="text-[11px] text-muted-foreground">Or text them: &ldquo;Hey, I got my period today! Can we pick up some supplies?&rdquo;</p>
              </div>

              <div className="p-4 rounded-2xl bg-secondary/35 border border-border/60 space-y-1.5">
                <p className="font-semibold text-primary">To a friend at school:</p>
                <div className="p-3 rounded-xl bg-card border border-border/70 text-foreground italic">
                  &ldquo;Do you happen to have an extra pad in your bag? Mine just started unexpectedly.&rdquo;
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-secondary/35 border border-border/60 space-y-1.5">
                <p className="font-semibold text-primary">To the school nurse:</p>
                <div className="p-3 rounded-xl bg-card border border-border/70 text-foreground italic">
                  &ldquo;Hello, I started my period and I don’t have any pads with me. Do you have one I could use?&rdquo;
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
