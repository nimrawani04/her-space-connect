import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/experience")({
  head: () => ({ meta: [{ title: "Experience Match · HerSpace" }] }),
  component: Experience,
});

const journeys = [
  { title: "Living with PCOS", count: 1240, tags: ["Health", "Hormones"] },
  { title: "Study abroad", count: 870, tags: ["Education", "Move"] },
  { title: "First engineering job", count: 620, tags: ["Career", "Tech"] },
  { title: "Divorce recovery", count: 410, tags: ["Family", "Healing"] },
  { title: "Building my startup", count: 380, tags: ["Founder"] },
  { title: "Freelancing full-time", count: 290, tags: ["Career"] },
];

function Experience() {
  const [q, setQ] = useState("");
  const filtered = journeys.filter((j) => j.title.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-earth mb-2">03 · Match</p>
        <h1 className="text-4xl md:text-5xl font-serif italic">Experience Match</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">Find women who've lived what you're living. Request a conversation, or join the circle around a shared journey.</p>
      </header>
      <Input placeholder="Search a journey…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
      <div className="grid sm:grid-cols-2 gap-4">
        {filtered.map((j) => (
          <Card key={j.title}>
            <CardHeader><CardTitle className="font-serif italic text-xl">{j.title}</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">{j.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}</div>
                <p className="text-xs text-muted-foreground">{j.count.toLocaleString()} sisters</p>
              </div>
              <Button variant="outline" className="rounded-full">Join circle</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}