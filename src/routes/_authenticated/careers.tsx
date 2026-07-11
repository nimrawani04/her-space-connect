import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/careers")({
  head: () => ({ meta: [{ title: "Careers · HerSpace" }] }),
  component: Careers,
});

const PAGE_SIZE = 12;

function Careers() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ type: "", title: "", org: "", region: "", url: "" });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");

  // Load distinct types/regions for filter dropdowns (data-driven).
  const { data: facets } = useQuery({
    queryKey: ["opportunities", "facets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("type,region")
        .limit(1000);
      if (error) throw error;
      const types = Array.from(new Set((data ?? []).map((r) => r.type).filter(Boolean))).sort();
      const regions = Array.from(new Set((data ?? []).map((r) => r.region).filter(Boolean))).sort();
      return { types, regions };
    },
  });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["opportunities", { search, typeFilter, regionFilter }],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase
        .from("opportunities")
        .select("id,type,title,org,region,url")
        .order("created_at", { ascending: false })
        .range(from, to);
      if (typeFilter !== "all") q = q.eq("type", typeFilter);
      if (regionFilter !== "all") q = q.eq("region", regionFilter);
      if (search.trim()) {
        const s = search.trim().replace(/[%,]/g, "");
        q = q.or(`title.ilike.%${s}%,org.ilike.%${s}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    getNextPageParam: (last, all) => (last.length < PAGE_SIZE ? undefined : all.length),
  });
  const opps = data?.pages.flat() ?? [];
  const activeFilters = useMemo(
    () => (typeFilter !== "all" ? 1 : 0) + (regionFilter !== "all" ? 1 : 0) + (search.trim() ? 1 : 0),
    [typeFilter, regionFilter, search],
  );

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
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif italic">Careers & Opportunity</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">Internships, scholarships, fellowships, grants, and competitions shared by the community — for women, by women.</p>
      </header>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="font-serif italic text-2xl">Open opportunities</CardTitle>
            <div className="grid sm:grid-cols-[1fr_auto_auto_auto] gap-2 pt-4">
              <Input
                placeholder="Search title or organization…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="sm:w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {facets?.types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="sm:w-[160px]"><SelectValue placeholder="Region" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All regions</SelectItem>
                  {facets?.regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                className="rounded-full"
                disabled={activeFilters === 0}
                onClick={() => { setSearch(""); setTypeFilter("all"); setRegionFilter("all"); }}
              >
                Clear{activeFilters ? ` (${activeFilters})` : ""}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!isLoading && opps.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {activeFilters ? "No opportunities match your filters." : "No opportunities yet — share the first."}
              </p>
            )}
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
            {hasNextPage && (
              <div className="pt-2">
                <Button variant="outline" className="rounded-full w-full" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                  {isFetchingNextPage ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
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