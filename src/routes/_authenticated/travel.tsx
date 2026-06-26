import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plane } from "lucide-react";

export const Route = createFileRoute("/_authenticated/travel")({
  head: () => ({ meta: [{ title: "Travel Sisterhood · HerSpace" }] }),
  component: Travel,
});

const cities = [
  { city: "Lisbon", country: "Portugal", hosts: 24, verified: true },
  { city: "Bogotá", country: "Colombia", hosts: 11, verified: true },
  { city: "Bangalore", country: "India", hosts: 38, verified: true },
  { city: "Mexico City", country: "Mexico", hosts: 19, verified: true },
  { city: "Berlin", country: "Germany", hosts: 27, verified: true },
  { city: "Nairobi", country: "Kenya", hosts: 9, verified: false },
];

function Travel() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-earth mb-2">08 · Sisterhood on the road</p>
        <h1 className="text-4xl md:text-5xl font-serif italic">Travel Sisterhood</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">Verified women locals across the world. Stranded in a new city? Find a sister, a safe stay, and trusted transport.</p>
      </header>
      <Alert>
        <Plane className="h-4 w-4" />
        <AlertTitle>Trust & safety</AlertTitle>
        <AlertDescription>Hosts are ID-verified. We do not share location data publicly. If you're in immediate danger, call local emergency services first.</AlertDescription>
      </Alert>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cities.map((c) => (
          <Card key={c.city}>
            <CardHeader><CardTitle className="font-serif italic text-xl">{c.city}, {c.country}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-2"><Badge variant="outline">{c.hosts} hosts</Badge>{c.verified && <Badge variant="default" className="bg-sage text-background">verified</Badge>}</div>
              <Button variant="outline" className="rounded-full w-full">View sisters</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}