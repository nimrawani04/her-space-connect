import { createFileRoute } from "@tanstack/react-router";
import { Baby, BookOpen, Bot, FlaskConical, Sprout, Stethoscope, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePregnancyProfile } from "@/hooks/use-pregnancy-profile";
import { useLifeStagePreferences } from "@/hooks/use-life-stage-preferences";
import { Planning } from "@/components/pregnancy/Planning";
import { StageSetup } from "@/components/pregnancy/StageSetup";
import { Journey } from "@/components/pregnancy/Journey";
import { HealthTracking } from "@/components/pregnancy/HealthTracking";
import { KnowledgeHub } from "@/components/pregnancy/KnowledgeHub";
import { Companion } from "@/components/pregnancy/Companion";
import { gestationalAge } from "@/lib/pregnancy";

export const Route = createFileRoute("/_authenticated/pregnancy")({
  head: () => ({
    meta: [
      { title: "Pregnancy Journey · HerSpace" },
      { name: "description", content: "Plan, test and track pregnancy week by week — fertility, trimesters, health logs and an AI pregnancy companion." },
      { property: "og:title", content: "Pregnancy Journey · HerSpace" },
      { property: "og:description", content: "From pre-conception to week 40: fertility tracking, weekly guidance, health logs and an AI companion." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pregnancy,
});

function Pregnancy() {
  const { preferences: lifeStages, setPreference } = useLifeStagePreferences();
  const { profile, loading, save } = usePregnancyProfile();
  const ga = profile.lmp_date ? gestationalAge(profile.lmp_date) : null;
  const isPregnant = profile.stage === "pregnant";

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="relative rounded-3xl bg-card/90 border border-border/80 p-4 sm:p-6 md:p-8 backdrop-blur-md shadow-xs overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <Baby className="h-4 w-4 text-primary" />
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
            Matrescence & Fertility Journey
          </p>
        </div>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif italic text-foreground tracking-tight">Pregnancy & Fertility</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base leading-relaxed font-light">
          From preconception planning to week 40 matrescence: cycle awareness, developmental tracking, and gentle maternal support.
        </p>
        {isPregnant && ga && (
          <p className="mt-4 font-serif italic text-xl text-primary font-medium">
            You&apos;re {ga.weeks} weeks {ga.days} days pregnant{profile.due_date ? ` · due ${new Date(profile.due_date).toLocaleDateString()}` : ""}.
          </p>
        )}
      </header>

      {!lifeStages.pregnancy ? (
        <Card className="rounded-3xl border border-primary/25 bg-card/90 p-4 sm:p-6 md:p-8 shadow-xs">
          <CardContent className="p-0 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div className="space-y-1.5">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-lg">🍼</span>
                <h3 className="font-serif italic text-xl text-foreground font-semibold">
                  Pregnancy Hub is Currently Inactive
                </h3>
              </div>
              <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                You currently have Pregnancy &amp; Postpartum tracking turned off in your Health Settings. You can enable it anytime to show it in your sidebar navigation and track your maternal journey.
              </p>
            </div>
            <Button
              onClick={() => setPreference("pregnancy", true)}
              className="rounded-full shadow-xs px-6 text-xs shrink-0 cursor-pointer"
            >
              Enable Pregnancy Hub
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>
      ) : (
        <Tabs defaultValue={isPregnant ? "journey" : "planning"}>
          <div className="overflow-x-auto -mx-1 px-1 pb-1 scrollbar-none">
            <TabsList className="flex h-auto p-1.5 gap-1.5 bg-card/85 backdrop-blur-md border border-border/70 rounded-full w-max min-w-full sm:min-w-0">
              <TabsTrigger value="planning" className="gap-2 shrink-0 rounded-full text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground cursor-pointer">
                <Sprout className="h-3.5 w-3.5" /> Planning
              </TabsTrigger>
              <TabsTrigger value="test" className="gap-2 shrink-0 rounded-full text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground cursor-pointer">
                <FlaskConical className="h-3.5 w-3.5" /> Test
              </TabsTrigger>
              <TabsTrigger value="journey" className="gap-2 shrink-0 rounded-full text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground cursor-pointer">
                <Baby className="h-3.5 w-3.5" /> Journey
              </TabsTrigger>
              <TabsTrigger value="tracking" className="gap-2 shrink-0 rounded-full text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground cursor-pointer">
                <Stethoscope className="h-3.5 w-3.5" /> Health
              </TabsTrigger>
              <TabsTrigger value="learn" className="gap-2 shrink-0 rounded-full text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground cursor-pointer">
                <BookOpen className="h-3.5 w-3.5" /> Knowledge
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-2 shrink-0 rounded-full text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground cursor-pointer">
                <Bot className="h-3.5 w-3.5" /> Companion
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="planning" className="mt-6"><Planning /></TabsContent>
          <TabsContent value="test" className="mt-6"><StageSetup profile={profile} save={save} /></TabsContent>
          <TabsContent value="journey" className="mt-6"><Journey profile={profile} save={save} /></TabsContent>
          <TabsContent value="tracking" className="mt-6"><HealthTracking /></TabsContent>
          <TabsContent value="learn" className="mt-6"><KnowledgeHub /></TabsContent>
          <TabsContent value="ai" className="mt-6"><Companion profile={profile} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}