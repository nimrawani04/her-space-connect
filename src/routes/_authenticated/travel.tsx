import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plane } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/travel")({
  head: () => ({ meta: [{ title: "Travel Sisterhood · HerSpace" }] }),
  component: Travel,
});

function Travel() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ city: "", country: "", note: "" });

  const { data: cities = [], isLoading } = useQuery({
    queryKey: ["travel_hosts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("travel_hosts")
        .select("id,city,country,verified");
      if (error) throw error;
      const map = new Map<string, { city: string; country: string; hosts: number; verified: boolean }>();
      (data ?? []).forEach((h: any) => {
        const key = `${h.city}|${h.country}`;
        const cur = map.get(key) ?? { city: h.city, country: h.country, hosts: 0, verified: false };
        cur.hosts += 1;
        cur.verified = cur.verified || h.verified;
        map.set(key, cur);
      });
      return Array.from(map.values()).sort((a, b) => b.hosts - a.hosts);
    },
  });

  const becomeHost = useMutation({
    mutationFn: async () => {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      if (!uid) throw new Error("Sign in required");
      if (!form.city.trim() || !form.country.trim()) throw new Error("City and country required");
      const { error } = await supabase.from("travel_hosts").insert({
        user_id: uid, city: form.city.trim(), country: form.country.trim(), note: form.note.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ city: "", country: "", note: "" });
      qc.invalidateQueries({ queryKey: ["travel_hosts"] });
      toast.success("You're listed as a local sister");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-earth mb-2">08 · Sisterhood on the road</p>
        <h1 className="text-4xl md:text-5xl font-serif italic">Travel Sisterhood</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">Women locals across the world. Stranded in a new city? Find a sister, a safe stay, and trusted transport.</p>
      </header>
      <Alert>
        <Plane className="h-4 w-4" />
        <AlertTitle>Trust & safety</AlertTitle>
        <AlertDescription>Verified hosts carry the verified badge. We do not share location data publicly. If you're in immediate danger, call local emergency services first.</AlertDescription>
      </Alert>
      <Card>
        <CardHeader><CardTitle className="font-serif italic text-lg">Become a local sister</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-4 gap-2">
          <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <Input className="sm:col-span-2" placeholder="A line about how you can help (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <Button onClick={() => becomeHost.mutate()} disabled={becomeHost.isPending} className="rounded-full sm:col-span-4">List me</Button>
        </CardContent>
      </Card>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && cities.length === 0 && <p className="text-sm text-muted-foreground">No hosts yet — be the first to list your city.</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cities.map((c) => (
          <Card key={`${c.city}-${c.country}`}>
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