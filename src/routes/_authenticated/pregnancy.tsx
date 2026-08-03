import { createFileRoute } from "@tanstack/react-router";
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
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-earth mb-2">🤰 Women's journey</p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif italic">Pregnancy</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          Period tracking flows naturally into pregnancy: plan, test, then follow week 1 to 40 with your own health data and an AI companion beside you.
        </p>
        {isPregnant && ga && (
          <p className="mt-3 font-serif italic text-xl">
            You're {ga.weeks} weeks {ga.days} days pregnant{profile.due_date ? ` · due ${new Date(profile.due_date).toLocaleDateString()}` : ""}.
          </p>
        )}
      </header>

      {loading ? (
        <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>
      ) : (
        <Tabs defaultValue={isPregnant ? "journey" : "planning"}>
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="w-max">
              <TabsTrigger value="planning">🌱 Planning</TabsTrigger>
              <TabsTrigger value="test">🧪 Test</TabsTrigger>
              <TabsTrigger value="journey">🤰 Journey</TabsTrigger>
              <TabsTrigger value="tracking">🩺 Health</TabsTrigger>
              <TabsTrigger value="learn">📚 Knowledge</TabsTrigger>
              <TabsTrigger value="ai">🤖 Companion</TabsTrigger>
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