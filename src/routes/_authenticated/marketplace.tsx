import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/marketplace")({
  head: () => ({ meta: [{ title: "Marketplace · HerSpace" }] }),
  component: Marketplace,
});

const services = [
  { name: "Maya R.", craft: "Brand designer", price: "$60/hr", tags: ["Logos", "Identity"] },
  { name: "Sara T.", craft: "Math tutor (SAT/JEE)", price: "$25/hr", tags: ["Tutoring"] },
  { name: "Lin K.", craft: "Full-stack developer", price: "$80/hr", tags: ["React", "Node"] },
  { name: "Priya N.", craft: "Career coach", price: "$120/hr", tags: ["Coaching"] },
  { name: "Noor A.", craft: "Pastry chef", price: "$15/portion", tags: ["Baking"] },
  { name: "Eve M.", craft: "Copywriter", price: "$0.20/word", tags: ["Writing"] },
];

function Marketplace() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-earth mb-2">06 · Trade</p>
        <h1 className="text-4xl md:text-5xl font-serif italic">Women's Marketplace</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">Hire women — designers, developers, tutors, bakers, consultants, writers. Verified profiles, fair rates, reviews you can trust.</p>
      </header>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((s) => (
          <Card key={s.name}>
            <CardHeader><CardTitle className="font-serif italic text-xl">{s.craft}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">by {s.name}</p>
              <div className="flex flex-wrap gap-1.5">{s.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}</div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-medium">{s.price}</span>
                <Button size="sm" variant="outline" className="rounded-full">Hire</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}