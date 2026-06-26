import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plane, MapPin, Search, X, LocateFixed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useInfiniteQuery, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useServerFn } from "@tanstack/react-start";
import { reverseGeocode } from "@/lib/geocode.functions";

const travelSearchSchema = z.object({
  city: fallback(z.string().max(100), "").default(""),
  country: fallback(z.string().max(100), "").default(""),
  need: fallback(z.string().max(200), "").default(""),
  radius: fallback(z.union([z.literal(0), z.literal(5), z.literal(10), z.literal(25), z.literal(50), z.literal(100)]), 0).default(0),
});

const travelRequestsQueryOptions = (filters: { city: string; country: string; need: string }) =>
  queryOptions({
    queryKey: ["travel_requests", filters],
    queryFn: async () => {
      let q = supabase
        .from("travel_requests")
        .select("id,city,country,need,contact,created_at,user_id,latitude,longitude")
        .order("created_at", { ascending: false });
      if (filters.city.trim()) q = q.ilike("city", `%${filters.city.trim()}%`);
      if (filters.country.trim()) q = q.ilike("country", `%${filters.country.trim()}%`);
      if (filters.need.trim()) q = q.ilike("need", `%${filters.need.trim()}%`);
      const { data, error } = await q.limit(100);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

export const Route = createFileRoute("/_authenticated/travel")({
  head: () => ({ meta: [{ title: "Travel Sisterhood · HerSpace" }] }),
  validateSearch: zodValidator(travelSearchSchema),
  loaderDeps: ({ search: { city, country, need } }) => ({ city, country, need }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(travelRequestsQueryOptions(deps)),
  component: Travel,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-destructive">Could not load travel requests: {error.message}</p>
        <Button onClick={() => { reset(); router.invalidate(); }}>Try again</Button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-6 text-center">No travel requests found.</div>,
});

const PAGE_SIZE = 60;

function Travel() {
  const qc = useQueryClient();
  const navigate = useNavigate({ from: "/travel" });
  const search = Route.useSearch();
  const [form, setForm] = useState({ city: "", country: "", note: "" });
  const [req, setReq] = useState<{ city: string; country: string; need: string; contact: string; latitude: number | null; longitude: number | null }>({ city: "", country: "", need: "", contact: "", latitude: null, longitude: null });
  const [draft, setDraft] = useState(search);
  const [myCoords, setMyCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [postLocating, setPostLocating] = useState(false);
  const [autoLoc, setAutoLoc] = useState(false);
  const geocode = useServerFn(reverseGeocode);

  useEffect(() => {
    setDraft(search);
  }, [search.city, search.country, search.need, search.radius]);

  const { data: requests } = useSuspenseQuery(travelRequestsQueryOptions(search));

  function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  const sortedRequests = myCoords
    ? [...requests].sort((a: any, b: any) => {
        const da = a.latitude != null && a.longitude != null ? haversine(myCoords, { lat: a.latitude, lng: a.longitude }) : Infinity;
        const db = b.latitude != null && b.longitude != null ? haversine(myCoords, { lat: b.latitude, lng: b.longitude }) : Infinity;
        return da - db;
      })
    : requests;

  const visibleRequests = myCoords && search.radius > 0
    ? sortedRequests.filter((r: any) => {
        if (r.latitude == null || r.longitude == null) return false;
        return haversine(myCoords, { lat: r.latitude, lng: r.longitude }) <= search.radius;
      })
    : sortedRequests;

  function useMyLocation() {
    if (!("geolocation" in navigator)) { toast.error("Geolocation not supported"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success("Sorted by distance from you");
      },
      (err) => { setLocating(false); toast.error(err.message || "Could not get location"); },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  function detectLocation() {
    if (!("geolocation" in navigator)) { toast.error("Geolocation not supported"); setAutoLoc(false); return; }
    setPostLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { city, country } = await reverseGeocode({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setReq((r) => ({
            ...r,
            city: city || r.city,
            country: country || r.country,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }));
          toast.success(city ? `Location set to ${city}, ${country}` : "Coordinates attached");
        } catch (e: any) {
          setReq((r) => ({
            ...r,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }));
          toast.error(e.message || "Could not resolve city/country");
        } finally {
          setPostLocating(false);
        }
      },
      (err) => { setPostLocating(false); setAutoLoc(false); toast.error(err.message || "Could not get location"); },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

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
        latitude: req.latitude,
        longitude: req.longitude,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReq({ city: "", country: "", need: "", contact: "", latitude: null, longitude: null });
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
          <div className="sm:col-span-2 flex items-center gap-2 flex-wrap">
            <Button type="button" variant="outline" className="rounded-full" onClick={attachPostLocation} disabled={postLocating}>
              <LocateFixed className="h-4 w-4 mr-2" /> {postLocating ? "Locating…" : req.latitude != null ? "Update my location" : "Attach my location"}
            </Button>
            {req.latitude != null && req.longitude != null && (
              <span className="text-xs text-muted-foreground">Pinned: {req.latitude.toFixed(3)}, {req.longitude.toFixed(3)}</span>
            )}
          </div>
          <Button onClick={() => postRequest.mutate()} disabled={postRequest.isPending} className="rounded-full sm:col-span-2">
            Post to the network
          </Button>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Your contact is visible to signed-in members only. Share what you're comfortable with — never share home addresses publicly.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-serif italic text-2xl">Sisters reaching out now</h2>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={useMyLocation} disabled={locating}>
              <LocateFixed className="h-4 w-4 mr-2" /> {locating ? "Locating…" : myCoords ? "Update location" : "Use my location"}
            </Button>
            {myCoords && (
              <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => setMyCoords(null)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {myCoords && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">Within</span>
            {[0, 5, 10, 25, 50, 100].map((km) => (
              <Button
                key={km}
                type="button"
                size="sm"
                variant={search.radius === km ? "default" : "outline"}
                className="rounded-full h-7 px-3 text-xs"
                onClick={() => navigate({ search: { ...search, radius: km } as any })}
              >
                {km === 0 ? "Any" : `${km} km`}
              </Button>
            ))}
            <span className="text-xs text-muted-foreground ml-1">Sorted by distance. Posts without coordinates {search.radius > 0 ? "are hidden" : "appear last"}.</span>
          </div>
        )}
        {!myCoords && (
          <p className="text-xs text-muted-foreground">Tap "Use my location" to filter posts by distance.</p>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif italic text-lg flex items-center gap-2">
              <Search className="h-4 w-4" /> Find sisters near you
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                navigate({ search: { ...search, ...draft } as any });
              }}
              className="grid sm:grid-cols-4 gap-2"
            >
              <Input
                placeholder="City"
                value={draft.city}
                onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              />
              <Input
                placeholder="Country"
                value={draft.country}
                onChange={(e) => setDraft({ ...draft, country: e.target.value })}
              />
              <Input
                placeholder="Search need (e.g. stay, ride, walk)"
                value={draft.need}
                onChange={(e) => setDraft({ ...draft, need: e.target.value })}
              />
              <div className="flex gap-2">
                <Button type="submit" className="rounded-full flex-1">
                  <Search className="h-4 w-4 mr-2" /> Search
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full px-3"
                  onClick={() => {
                    const empty = { city: "", country: "", need: "" };
                    setDraft(empty);
                    navigate({ search: { ...search, ...empty } as any });
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {visibleRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {myCoords && search.radius > 0
              ? `No sisters within ${search.radius} km. Try a wider radius.`
              : "No matching requests. Try widening your filters or be the first to share."}
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {visibleRequests.length} sister{visibleRequests.length === 1 ? "" : "s"} found
              {myCoords && search.radius > 0 ? ` within ${search.radius} km` : ""}
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {visibleRequests.map((r: any) => {
                const dist = myCoords && r.latitude != null && r.longitude != null
                  ? haversine(myCoords, { lat: r.latitude, lng: r.longitude })
                  : null;
                return (
                <Card key={r.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-serif italic text-lg flex items-center gap-2 flex-wrap">
                      <MapPin className="h-4 w-4 text-earth" /> {r.city}, {r.country}
                      {dist != null && (
                        <Badge variant="outline" className="ml-auto text-xs font-sans not-italic">
                          {dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist < 10 ? dist.toFixed(1) : Math.round(dist)} km`} away
                        </Badge>
                      )}
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
                );
              })}
            </div>
          </>
        )}
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
