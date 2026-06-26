import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/careers")({
  head: () => ({ meta: [{ title: "Careers · HerSpace" }] }),
  component: Careers,
});

const opps = [
  { type: "Scholarship", title: "Schwarzman Scholars 2026", org: "Tsinghua University", region: "Global" },
  { type: "Fellowship", title: "Mozilla Tech Fellows", org: "Mozilla Foundation", region: "Remote" },
  { type: "Grant", title: "Cartier Women's Initiative", org: "Cartier", region: "Global" },
  { type: "Internship", title: "ML Research Intern", org: "DeepMind", region: "London" },
  { type: "Competition", title: "Women in AI Hackathon", org: "WAI", region: "Online" },
];

const roadmap = ["Python", "Statistics", "Machine Learning", "Build 3 projects", "Apply to internships", "Mock interviews"];

function Careers() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-earth mb-2">05 · Opportunity</p>
        <h1 className="text-4xl md:text-5xl font-serif italic">Careers & Opportunity</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">Hand-curated internships, scholarships, fellowships, grants, and competitions for women — plus AI-built roadmaps.</p>
      </header>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader><CardTitle className="font-serif italic text-2xl">Open opportunities</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {opps.map((o) => (
              <div key={o.title} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                <div>
                  <div className="flex gap-2 mb-1"><Badge variant="outline">{o.type}</Badge><Badge variant="outline">{o.region}</Badge></div>
                  <p className="font-medium">{o.title}</p>
                  <p className="text-xs text-muted-foreground">{o.org}</p>
                </div>
                <Button size="sm" variant="outline" className="rounded-full">View</Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="bg-sand/40 self-start">
          <CardHeader><CardTitle className="font-serif italic">Women in AI roadmap</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {roadmap.map((s, i) => (
                <li key={s} className="flex gap-3 text-sm">
                  <span className="size-6 rounded-full bg-earth text-earth-foreground grid place-items-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}