import { createFileRoute } from "@tanstack/react-router";
import { Baby, BookOpen, Bot, FlaskConical, Sprout, Stethoscope } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { usePregnancyProfile } from "@/hooks/use-pregnancy-profile";
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
  const { profile, loading, save } = usePregnancyProfile();
  const ga = profile.lmp_date ? gestationalAge(profile.lmp_date) : null;
  const isPregnant = profile.stage === "pregnant";

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="relative rounded-3xl bg-card/90 border border-border/80 p-6 sm:p-8 backdrop-blur-md shadow-xs overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <Baby className="h-4 w-4 text-primary" />
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
            Matrescence & Fertility Journey
          </p>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif italic text-foreground tracking-tight">Pregnancy & Fertility</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base leading-relaxed font-light">
          From preconception planning to week 40 matrescence: cycle awareness, developmental tracking, and gentle maternal support.
        </p>
        {isPregnant && ga && (
          <p className="mt-4 font-serif italic text-xl text-primary font-medium">
            You&apos;re {ga.weeks} weeks {ga.days} days pregnant{profile.due_date ? ` · due ${new Date(profile.due_date).toLocaleDateString()}` : ""}.
          </p>
        )}
      </header>

      {loading ? (
        <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>
      ) : (
        <Tabs defaultValue={isPregnant ? "journey" : "planning"}>
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="w-max">
              <TabsTrigger value="planning" className="gap-2">
                <Sprout className="h-3.5 w-3.5" /> Planning
              </TabsTrigger>
              <TabsTrigger value="test" className="gap-2">
                <FlaskConical className="h-3.5 w-3.5" /> Test
              </TabsTrigger>
              <TabsTrigger value="journey" className="gap-2">
                <Baby className="h-3.5 w-3.5" /> Journey
              </TabsTrigger>
              <TabsTrigger value="tracking" className="gap-2">
                <Stethoscope className="h-3.5 w-3.5" /> Health
              </TabsTrigger>
              <TabsTrigger value="learn" className="gap-2">
                <BookOpen className="h-3.5 w-3.5" /> Knowledge
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-2">
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