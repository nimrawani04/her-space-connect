import { useCallback, useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LocateFixed, Search, Users, Info } from "lucide-react";

const CATEGORIES: Record<string, { label: string; color: string }> = {
  harassment: { label: "Harassment", color: "#e11d48" },
  stalking: { label: "Stalking", color: "#9333ea" },
  poorly_lit: { label: "Poorly lit road", color: "#d97706" },
  isolated: { label: "Isolated area", color: "#0891b2" },
  unsafe_transport: { label: "Unsafe transport", color: "#2563eb" },
  suspicious_recurring: { label: "Suspicious recurring behaviour", color: "#57534e" },
};
const TIMES: Record<string, string> = {
  any: "Any time", morning: "Morning", afternoon: "Afternoon", evening: "Evening (after 6 PM)", night: "Night (after 9 PM)",
};

type Pattern = { cell_lat: number; cell_lng: number; category: string; time_window: string; reporters: number; last_reported: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export default function SafetyMap() {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const pinRef = useRef<Leaflet.CircleMarker | null>(null);

  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [useLocation, setUseLocation] = useState(false);
  const [query, setQuery] = useState("");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [category, setCategory] = useState("poorly_lit");
  const [timeWindow, setTimeWindow] = useState("evening");
  const [areaLabel, setAreaLabel] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const loadPatterns = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    const { data, error } = await db.rpc("get_safety_patterns", {
      min_lat: b.getSouth(), max_lat: b.getNorth(), min_lng: b.getWest(), max_lng: b.getEast(),
    });
    if (error) { toast.error(error.message); return; }
    setPatterns(((data ?? []) as Pattern[]).map((p) => ({ ...p, cell_lat: Number(p.cell_lat), cell_lng: Number(p.cell_lng), reporters: Number(p.reporters) })));
  }, []);

  // Init map (leaflet loaded only in the browser)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapEl.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(mapEl.current, { zoomControl: true }).setView([20.59, 78.96], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors", maxZoom: 18,
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      map.on("click", (e: Leaflet.LeafletMouseEvent) => setPin({ lat: e.latlng.lat, lng: e.latlng.lng }));
      map.on("moveend", () => loadPatterns());
      mapRef.current = map;
      loadPatterns();
    })();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, [loadPatterns]);

  // Draw patterns
  useEffect(() => {
    const L = LRef.current, layer = layerRef.current;
    if (!L || !layer) return;
    layer.clearLayers();
    for (const p of patterns) {
      const c = CATEGORIES[p.category] ?? { label: p.category, color: "#57534e" };
      L.circle([p.cell_lat, p.cell_lng], {
        radius: 180 + Math.min(p.reporters, 30) * 25,
        color: c.color, fillColor: c.color, fillOpacity: Math.min(0.15 + p.reporters * 0.03, 0.55), weight: 1,
      })
        .bindPopup(`<strong>${c.label}</strong><br/>${p.reporters} women reported this independently<br/>Mostly: ${TIMES[p.time_window] ?? p.time_window}`)
        .addTo(layer);
    }
  }, [patterns]);

  // Draw my pending pin
  useEffect(() => {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map) return;
    pinRef.current?.remove();
    if (pin) pinRef.current = L.circleMarker([pin.lat, pin.lng], { radius: 8, color: "#111", weight: 2, fillOpacity: 0.2 }).addTo(map);
  }, [pin]);

  // "Use my location" toggle
  useEffect(() => {
    if (!useLocation) return;
    if (!navigator.geolocation) { toast.error("Location isn't available on this device."); setUseLocation(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current?.setView([latitude, longitude], 15);
        setPin({ lat: latitude, lng: longitude });
      },
      () => { toast.error("Couldn't get your location. Try typing the place instead."); setUseLocation(false); },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }, [useLocation]);

  async function searchPlace(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
      const [hit] = await res.json();
      if (!hit) { toast.error("Place not found."); return; }
      mapRef.current?.setView([Number(hit.lat), Number(hit.lon)], 15);
      if (!areaLabel) setAreaLabel(query.slice(0, 120));
    } catch { toast.error("Search failed. Try again."); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const target = pin ?? (mapRef.current ? mapRef.current.getCenter() : null);
    if (!target) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setBusy(false); return; }
    const { error } = await db.from("safety_map_reports").insert({
      user_id: u.user.id, category, time_window: timeWindow,
      cell_lat: target.lat, cell_lng: target.lng,
      area_label: areaLabel.trim() || null, note: note.trim() || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thank you. Your report joins the community pattern anonymously.");
    setNote(""); setPin(null);
    loadPatterns();
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <form onSubmit={searchPlace} className="flex gap-2 flex-1">
                <Input placeholder="Type a place, road or area…" value={query} onChange={(e) => setQuery(e.target.value)} />
                <Button type="submit" variant="outline" size="icon" aria-label="Search place"><Search className="h-4 w-4" /></Button>
              </form>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={useLocation} onCheckedChange={setUseLocation} />
                <LocateFixed className="h-4 w-4" /> Use my location
              </label>
            </div>
            <div ref={mapEl} className="h-[420px] sm:h-[520px] w-full rounded-xl overflow-hidden border border-border z-0" />
            <div className="flex flex-wrap gap-2">
              {Object.entries(CATEGORIES).map(([k, c]) => (
                <span key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />{c.label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex gap-3 text-sm text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
            <p>This map shows <strong className="text-foreground">patterns, not people</strong>. An area appears only when at least 3 women have independently reported the same concern. Locations are blurred to roughly 500 m, and no names or individual reports are ever shown. This is not an emergency service.</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="font-serif italic">Share what you noticed</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {pin ? "Spot selected on the map." : "Tap the map to choose a spot, or we'll use the map's centre."}
              </p>
              <div><Label>What kind of concern?</Label>
                <Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CATEGORIES).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>When does it feel unsafe?</Label>
                <Select value={timeWindow} onValueChange={setTimeWindow}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TIMES).map(([k, t]) => <SelectItem key={k} value={k}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Area name (optional)</Label><Input maxLength={120} value={areaLabel} onChange={(e) => setAreaLabel(e.target.value)} placeholder="e.g. Station Road underpass" /></div>
              <div><Label>Note (optional)</Label><Textarea rows={3} maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Describe the place, not a person." /></div>
              <Button type="submit" disabled={busy} className="w-full rounded-full">Add anonymously</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />Patterns in this view</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {patterns.length === 0 && <p className="text-sm text-muted-foreground">No community patterns here yet.</p>}
            {patterns.slice(0, 12).map((p, i) => (
              <button key={i} type="button" onClick={() => mapRef.current?.setView([p.cell_lat, p.cell_lng], 16)}
                className="w-full text-left rounded-lg border border-border p-2.5 hover:bg-muted transition-colors">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORIES[p.category]?.color }} />
                  <span className="text-sm font-medium">{CATEGORIES[p.category]?.label ?? p.category}</span>
                  <Badge variant="outline" className="ml-auto">{p.reporters} women</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Mostly {TIMES[p.time_window]?.toLowerCase() ?? p.time_window}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
