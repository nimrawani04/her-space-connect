import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/marketplace")({
  head: () => ({ meta: [{ title: "Marketplace · HerSpace" }] }),
  component: Marketplace,
});

function Marketplace() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ provider_name: "", craft: "", price: "", tags: "" });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["service_listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_listings")
        .select("id,provider_name,craft,price,tags")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addListing = useMutation({
    mutationFn: async () => {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      if (!uid) throw new Error("Sign in required");
      if (!form.craft.trim() || !form.provider_name.trim() || !form.price.trim()) throw new Error("Name, craft and price required");
      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const { error } = await supabase.from("service_listings").insert({
        user_id: uid,
        provider_name: form.provider_name.trim(),
        craft: form.craft.trim(),
        price: form.price.trim(),
        tags,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ provider_name: "", craft: "", price: "", tags: "" });
      qc.invalidateQueries({ queryKey: ["service_listings"] });
      toast.success("Listing published");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-earth mb-2">06 · Trade</p>
        <h1 className="text-4xl md:text-5xl font-serif italic">Women's Marketplace</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">Hire women — designers, developers, tutors, bakers, consultants, writers. Verified profiles, fair rates, reviews you can trust.</p>
      </header>
      <Card>
        <CardHeader><CardTitle className="font-serif italic text-lg">List your service</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <Input placeholder="Your name" value={form.provider_name} onChange={(e) => setForm({ ...form, provider_name: e.target.value })} />
          <Input placeholder="What you do" value={form.craft} onChange={(e) => setForm({ ...form, craft: e.target.value })} />
          <Input placeholder="Price (e.g. $60/hr)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <div className="flex gap-2">
            <Input placeholder="Tags (comma)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            <Button onClick={() => addListing.mutate()} disabled={addListing.isPending} className="rounded-full">List</Button>
          </div>
        </CardContent>
      </Card>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && services.length === 0 && <p className="text-sm text-muted-foreground">No listings yet — be the first.</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((s) => (
          <Card key={s.id}>
            <CardHeader><CardTitle className="font-serif italic text-xl">{s.craft}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">by {s.provider_name}</p>
              <div className="flex flex-wrap gap-1.5">{(s.tags as string[]).map((t) => <Badge key={t} variant="outline">{t}</Badge>)}</div>
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