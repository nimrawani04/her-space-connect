import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/careers")({
  head: () => ({ meta: [{ title: "Careers · HerSpace" }] }),
  component: Careers,
});

function Careers() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ type: "", title: "", org: "", region: "", url: "" });

  const { data: opps = [], isLoading } = useQuery({
    queryKey: ["opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("id,type,title,org,region,url")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addOpp = useMutation({
    mutationFn: async () => {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      if (!uid) throw new Error("Sign in required");
      if (!form.title.trim() || !form.type.trim()) throw new Error("Type and title required");
      const { error } = await supabase.from("opportunities").insert({
        type: form.type.trim(), title: form.title.trim(), org: form.org.trim() || "—",
        region: form.region.trim() || "Global", url: form.url.trim() || null, created_by: uid,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ type: "", title: "", org: "", region: "", url: "" });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Opportunity shared");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-earth mb-2">05 · Opportunity</p>
        <h1 className="text-4xl md:text-5xl font-serif italic">Careers & Opportunity</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">Internships, scholarships, fellowships, grants, and competitions shared by the community — for women, by women.</p>
      </header>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader><CardTitle className="font-serif italic text-2xl">Open opportunities</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!isLoading && opps.length === 0 && <p className="text-sm text-muted-foreground">No opportunities yet — share the first.</p>}
            {opps.map((o) => (
              <div key={o.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                <div>
                  <div className="flex gap-2 mb-1"><Badge variant="outline">{o.type}</Badge><Badge variant="outline">{o.region}</Badge></div>
                  <p className="font-medium">{o.title}</p>
                  <p className="text-xs text-muted-foreground">{o.org}</p>
                </div>
                <Button asChild size="sm" variant="outline" className="rounded-full" disabled={!o.url}>
                  <a href={o.url ?? "#"} target="_blank" rel="noopener noreferrer">View</a>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="bg-sand/40 self-start">
          <CardHeader><CardTitle className="font-serif italic">Share an opportunity</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Type (Scholarship, Grant…)" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Organization" value={form.org} onChange={(e) => setForm({ ...form, org: e.target.value })} />
            <Input placeholder="Region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
            <Input placeholder="Link (https://…)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <Button onClick={() => addOpp.mutate()} disabled={addOpp.isPending} className="rounded-full w-full">Share</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}