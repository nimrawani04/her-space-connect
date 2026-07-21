import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/careers")({
  head: () => ({ meta: [{ title: "Careers · HerSpace" }] }),
  component: Careers,
});

const PAGE_SIZE = 12;

// Rotating profession labels shown inside skeleton rows so the loading state
// feels like the sisterhood scrolling past — not a generic spinner.
const PROFESSIONS = [
  "Engineer", "Researcher", "Designer", "Founder", "Doctor",
  "Architect", "Lawyer", "Journalist", "Artist", "Scientist",
  "Educator", "Analyst", "Diplomat", "Chef", "Filmmaker", "Pilot",
];

function ProfessionSkeletonRow({ i }: { i: number }) {
  const label = PROFESSIONS[i % PROFESSIONS.length];
  const initial = label[0];
  return (
    <div
      className="flex items-center justify-between border-b border-border pb-3 last:border-0 motion-reduce:animate-none animate-fade-in"
      style={{ animationDelay: `${i * 60}ms` }}
      aria-hidden="true"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-sand to-muted flex items-center justify-center text-earth font-serif italic text-lg relative overflow-hidden border border-border"
        >
          <span className="relative z-10">{initial}</span>
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-background/70 to-transparent motion-reduce:animate-none animate-[shimmer_1.6s_ease-in-out_infinite]" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex gap-2">
            <span className="h-4 w-16 rounded-full bg-muted/80 overflow-hidden relative">
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-background/70 to-transparent motion-reduce:animate-none animate-[shimmer_1.6s_ease-in-out_infinite]" />
            </span>
            <span className="h-4 w-20 rounded-full bg-muted/70 overflow-hidden relative">
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-background/70 to-transparent motion-reduce:animate-none animate-[shimmer_1.6s_ease-in-out_infinite]" />
            </span>
          </div>
          <div className="h-4 rounded bg-muted/80 relative overflow-hidden" style={{ width: `${55 + ((i * 13) % 35)}%` }}>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-background/70 to-transparent motion-reduce:animate-none animate-[shimmer_1.6s_ease-in-out_infinite]" />
          </div>
          <div className="h-3 w-24 rounded bg-muted/60 relative overflow-hidden">
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-background/70 to-transparent motion-reduce:animate-none animate-[shimmer_1.6s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
      <span className="ml-3 text-[10px] uppercase tracking-[0.18em] text-earth/80 font-medium hidden sm:inline">
        {label}
      </span>
    </div>
  );
}

function CareersSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading more opportunities">
      {Array.from({ length: count }).map((_, i) => <ProfessionSkeletonRow key={i} i={i} />)}
    </div>
  );
}

function usePrevious<T>(value: T) {
  const ref = useRef<T>(value);
  useEffect(() => { ref.current = value; });
  return ref.current;
}

function Careers() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ type: "", title: "", org: "", region: "", url: "" });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [announcement, setAnnouncement] = useState("");

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

  const { data, isLoading, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
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

  // Auto-load next page when sentinel scrolls into view.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, opps.length]);

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
          <CardContent className="space-y-3" aria-busy={isLoading || isFetching}>
            {(isLoading || (isFetching && !isFetchingNextPage)) && (
              <CareersSkeleton count={5} />
            )}
            {!isLoading && !isFetching && opps.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {activeFilters ? "No opportunities match your filters." : "No opportunities yet — share the first."}
              </p>
            )}
            {!(isFetching && !isFetchingNextPage) && opps.map((o) => (
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
            {isFetchingNextPage && <CareersSkeleton count={3} />}
            {hasNextPage && (
              <div ref={sentinelRef} className="pt-2">
                <Button
                  variant="outline"
                  className="rounded-full w-full"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? "Loading more…" : "Load more"}
                </Button>
              </div>
            )}
            {!hasNextPage && opps.length > PAGE_SIZE && (
              <p className="text-center text-xs text-muted-foreground pt-2">You've reached the end.</p>
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