import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/experience")({
  head: () => ({ meta: [{ title: "Experience Match · HerSpace" }] }),
  component: Experience,
});

function Experience() {
  const [q, setQ] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const qc = useQueryClient();

  const { data: userId } = useQuery({
    queryKey: ["uid"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const { data: journeys = [], isLoading } = useQuery({
    queryKey: ["journeys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journeys")
        .select("id,title,tags,journey_members(user_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((j: any) => ({
        id: j.id,
        title: j.title,
        tags: j.tags as string[],
        count: j.journey_members?.length ?? 0,
        joined: !!j.journey_members?.some((m: any) => m.user_id === userId),
      }));
    },
    enabled: userId !== undefined,
  });

  const toggleJoin = useMutation({
    mutationFn: async (j: { id: string; joined: boolean }) => {
      if (!userId) throw new Error("Sign in required");
      if (j.joined) {
        const { error } = await supabase.from("journey_members").delete().eq("journey_id", j.id).eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("journey_members").insert({ journey_id: j.id, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["journeys"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const addJourney = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sign in required");
      const t = title.trim();
      if (!t) throw new Error("Title required");
      const parsedTags = tags.split(",").map((s) => s.trim()).filter(Boolean);
      const { error } = await supabase.from("journeys").insert({ title: t, tags: parsedTags, created_by: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle(""); setTags("");
      qc.invalidateQueries({ queryKey: ["journeys"] });
      toast.success("Journey added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = journeys.filter((j) => j.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-earth mb-2">03 · Match</p>
        <h1 className="text-4xl md:text-5xl font-serif italic">Experience Match</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">Find women who've lived what you're living. Request a conversation, or join the circle around a shared journey.</p>
      </header>
      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="Search a journey…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
      </div>
      <Card>
        <CardHeader><CardTitle className="font-serif italic text-lg">Start a new journey circle</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input placeholder="Journey title" value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-xs" />
          <Input placeholder="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} className="max-w-xs" />
          <Button onClick={() => addJourney.mutate()} disabled={addJourney.isPending} className="rounded-full">Add</Button>
        </CardContent>
      </Card>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      <div className="grid sm:grid-cols-2 gap-4">
        {filtered.map((j) => (
          <Card key={j.id}>
            <CardHeader><CardTitle className="font-serif italic text-xl">{j.title}</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">{j.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}</div>
                <p className="text-xs text-muted-foreground">{j.count.toLocaleString()} sisters</p>
              </div>
              <Button variant={j.joined ? "default" : "outline"} className="rounded-full" onClick={() => toggleJoin.mutate({ id: j.id, joined: j.joined })} disabled={toggleJoin.isPending}>
                {j.joined ? "Leave" : "Join circle"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}