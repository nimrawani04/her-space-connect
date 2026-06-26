import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plane, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/travel")({
  head: () => ({ meta: [{ title: "Travel Sisterhood · HerSpace" }] }),
  component: Travel,
});

const PAGE_SIZE = 60;

function Travel() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ city: "", country: "", note: "" });
  const [req, setReq] = useState({ city: "", country: "", need: "", contact: "" });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["travel_hosts"],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("travel_hosts")
        .select("id,city,country,verified")
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return data ?? [];
    },
    getNextPageParam: (last, all) => (last.length < PAGE_SIZE ? undefined : all.length),
  });
  const hosts = data?.pages.flat() ?? [];
  const map = new Map<string, { city: string; country: string; hosts: number; verified: boolean }>();
  hosts.forEach((h: any) => {
    const key = `${h.city}|${h.country}`;
    const cur = map.get(key) ?? { city: h.city, country: h.country, hosts: 0, verified: false };
    cur.hosts += 1;
    cur.verified = cur.verified || h.verified;
    map.set(key, cur);
  });
  const cities = Array.from(map.values()).sort((a, b) => b.hosts - a.hosts);

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

  const { data: requests = [], isLoading: reqLoading } = useQuery({
    queryKey: ["travel_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("travel_requests")
        .select("id,city,country,need,contact,created_at,user_id")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const postRequest = useMutation({
    mutationFn: async () => {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      if (!uid) throw new Error("Sign in required");
      if (!req.city.trim() || !req.country.trim() || !req.need.trim() || !req.contact.trim())
        throw new Error("City, country, need and contact are required");
      if (req.need.length > 500) throw new Error("Keep your need under 500 characters");
      if (req.contact.length > 200) throw new Error("Contact too long");
      const { error } = await supabase.from("travel_requests").insert({
        user_id: uid,
        city: req.city.trim(),
        country: req.country.trim(),
        need: req.need.trim(),
        contact: req.contact.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReq({ city: "", country: "", need: "", contact: "" });
      qc.invalidateQueries({ queryKey: ["travel_requests"] });
      toast.success("Shared — sisters nearby can reach you");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("travel_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["travel_requests"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const [meId, setMeId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
  }, []);

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

      <Card>
        <CardHeader>
          <CardTitle className="font-serif italic text-lg flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Share your location & what you need
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-2">
          <Input placeholder="City you're in" value={req.city} onChange={(e) => setReq({ ...req, city: e.target.value })} />
          <Input placeholder="Country" value={req.country} onChange={(e) => setReq({ ...req, country: e.target.value })} />
          <Textarea
            className="sm:col-span-2"
            placeholder="What do you need? (e.g. safe stay for 2 nights, trusted ride from airport, a sister to walk with)"
            value={req.need}
            maxLength={500}
            onChange={(e) => setReq({ ...req, need: e.target.value })}
          />
          <Input
            className="sm:col-span-2"
            placeholder="How sisters can reach you (WhatsApp, Signal, email, IG handle)"
            value={req.contact}
            maxLength={200}
            onChange={(e) => setReq({ ...req, contact: e.target.value })}
          />
          <Button onClick={() => postRequest.mutate()} disabled={postRequest.isPending} className="rounded-full sm:col-span-2">
            Post to the network
          </Button>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Your contact is visible to signed-in members only. Share what you're comfortable with — never share home addresses publicly.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-serif italic text-2xl">Sisters reaching out now</h2>
        {reqLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!reqLoading && requests.length === 0 && (
          <p className="text-sm text-muted-foreground">No active requests. Be the first to share where you are.</p>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          {requests.map((r: any) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="font-serif italic text-lg flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-earth" /> {r.city}, {r.country}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="whitespace-pre-wrap">{r.need}</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Reach her</p>
                <p className="font-medium break-words">{r.contact}</p>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                  {meId === r.user_id && (
                    <Button size="sm" variant="ghost" onClick={() => removeRequest.mutate(r.id)}>Remove</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

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
      {hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" className="rounded-full" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? "Loading…" : "Load more cities"}
          </Button>
        </div>
      )}
    </div>
  );
}