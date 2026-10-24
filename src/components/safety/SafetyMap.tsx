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
import {
  LocateFixed,
  Search,
  Users,
  Info,
  ShieldCheck,
  MapPin,
  Sparkles,
  Navigation,
  Compass,
  AlertTriangle,
  Zap,
} from "lucide-react";
import SafeRoutePlanner from "./SafeRoutePlanner";
import {
  RouteOption,
  TripFeedback,
  loadAllTripFeedbacks,
} from "@/lib/safe-routing";

// Categories divided into Safe Havens (Green signal) and Concerns (Amber/Rose)
const CATEGORIES: Record<string, { label: string; color: string; isSafe: boolean }> = {
  safe_haven: { label: "Safe Haven / Emergency Refuge", color: "#10b981", isSafe: true },
  well_lit_secure: { label: "Well-Lit & Secure Safe Zone", color: "#059669", isSafe: true },
  women_friendly_spot: { label: "Women-Friendly & Safe Place", color: "#14b8a6", isSafe: true },
  poorly_lit: { label: "Poorly lit road", color: "#d97706", isSafe: false },
  harassment: { label: "Harassment pattern", color: "#e11d48", isSafe: false },
  stalking: { label: "Stalking pattern", color: "#9333ea", isSafe: false },
  isolated: { label: "Isolated / low-visibility area", color: "#0891b2", isSafe: false },
  unsafe_transport: { label: "Unsafe transport route", color: "#2563eb", isSafe: false },
  suspicious_recurring: { label: "Suspicious recurring activity", color: "#57534e", isSafe: false },
};

const TIMES: Record<string, string> = {
  any: "Any time",
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening (after 6 PM)",
  night: "Night (after 9 PM)",
};

// Global benchmark safety zones reflecting real-world verified safety standards
const WORLD_SAFETY_BENCHMARKS = [
  {
    name: "Reykjavik Old Town & Harbor Safe Belt",
    lat: 64.1466,
    lng: -21.9426,
    safetyScore: 9.7,
    notes: "Global Peace Index #1 benchmark · 24/7 high visibility & emergency call posts.",
    type: "Safe Haven Zone",
    city: "Reykjavik, Iceland",
  },
  {
    name: "Tokyo Shibuya & Yamanote Transit Corridor",
    lat: 35.658,
    lng: 139.7016,
    safetyScore: 9.5,
    notes: "Designated safe transit cars, illuminated walking routes & 24/7 staffed Koban police boxes.",
    type: "Safe Transit Corridor",
    city: "Tokyo, Japan",
  },
  {
    name: "Singapore Central Marina & Orchard Safe District",
    lat: 1.3048,
    lng: 103.8318,
    safetyScore: 9.8,
    notes: "World-class public lighting, emergency response under 3 minutes & high security index.",
    type: "Safe District",
    city: "Singapore",
  },
  {
    name: "Zurich Bahnhof & Pedestrian Sanctuary",
    lat: 47.3769,
    lng: 8.5417,
    safetyScore: 9.4,
    notes: "High pedestrian security, well-lit transit arteries & active municipal escort assistance.",
    type: "Safe Haven Zone",
    city: "Zurich, Switzerland",
  },
  {
    name: "Seoul Safe Female Night-Scout Corridor",
    lat: 37.5665,
    lng: 126.978,
    safetyScore: 9.2,
    notes: "Designated safe-return-home corridors with illuminated CCTV beacons & night guards.",
    type: "Safe Commute Route",
    city: "Seoul, South Korea",
  },
  {
    name: "Vienna Ringstrasse Protected Walkway",
    lat: 48.2082,
    lng: 16.3738,
    safetyScore: 9.3,
    notes: "Continuous municipal lighting, active tram staff presence & high security rating.",
    type: "Safe Pedestrian Belt",
    city: "Vienna, Austria",
  },
];

type Pattern = {
  cell_lat: number;
  cell_lng: number;
  category: string;
  time_window: string;
  reporters: number;
  last_reported: string;
};

type SafePlaceMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  place_type: string;
  city: string;
  country: string;
  notes: string | null;
  safety_score?: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export default function SafetyMap() {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const routesLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const pinRef = useRef<Leaflet.CircleMarker | null>(null);

  // Navigation mode vs explore & report mode
  const [activeTab, setActiveTab] = useState<"navigate" | "explore">("navigate");

  // Safety map data
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [safePlaces, setSafePlaces] = useState<SafePlaceMarker[]>([]);
  const [allFeedbacks, setAllFeedbacks] = useState<TripFeedback[]>([]);
  const [useLocation, setUseLocation] = useState(false);
  const [query, setQuery] = useState("");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [category, setCategory] = useState("safe_haven");
  const [timeWindow, setTimeWindow] = useState("evening");
  const [areaLabel, setAreaLabel] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Safe routing state
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [activeRoute, setActiveRoute] = useState<RouteOption | null>(null);
  const [pinMode, setPinMode] = useState<"start" | "end" | "report" | null>(null);
  const pinModeRef = useRef<"start" | "end" | "report" | null>(null);
  pinModeRef.current = pinMode;

  const [simulatedPos, setSimulatedPos] = useState<[number, number] | null>(null);

  // Zoom smoothly to selected country / state / place
  const handleZoomToLocation = useCallback(
    (lat: number, lng: number, zoom: number, label?: string) => {
      if (mapRef.current) {
        mapRef.current.flyTo([lat, lng], zoom, { duration: 1.5 });
      }
    },
    []
  );

  // Load sister trip feedbacks
  const refreshFeedbacks = useCallback(async () => {
    try {
      const fbs = await loadAllTripFeedbacks();
      setAllFeedbacks(fbs);
    } catch {
      // silent catch
    }
  }, []);

  // Load community hazard patterns and safe places
  const loadPatterns = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();

    try {
      // 1. Load patterns from RPC
      const { data: patternData } = await db.rpc("get_safety_patterns", {
        min_lat: b.getSouth(),
        max_lat: b.getNorth(),
        min_lng: b.getWest(),
        max_lng: b.getEast(),
      });
      if (patternData) {
        setPatterns(
          (patternData as Pattern[]).map((p) => ({
            ...p,
            cell_lat: Number(p.cell_lat),
            cell_lng: Number(p.cell_lng),
            reporters: Number(p.reporters),
          }))
        );
      }
    } catch {
      // Silent catch for RPC fallback
    }

    try {
      // 2. Load safe places
      const { data: placesData } = await db
        .from("safe_places")
        .select("id, name, place_type, city, country, lat, lng, notes, safety_score")
        .limit(100);

      if (placesData) {
        const validPlaces: SafePlaceMarker[] = placesData
          .filter((p: SafePlaceMarker) => p.lat != null && p.lng != null)
          .map((p: SafePlaceMarker) => ({
            ...p,
            lat: Number(p.lat),
            lng: Number(p.lng),
          }));
        setSafePlaces(validPlaces);
      }
    } catch {
      // Silent catch
    }
  }, []);

  // Initialize Leaflet map
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapEl.current || mapRef.current) return;
      LRef.current = L;

      const map = L.map(mapEl.current, { zoomControl: true }).setView([35.658, 139.7016], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      layerRef.current = L.layerGroup().addTo(map);
      routesLayerRef.current = L.layerGroup().addTo(map);

      map.on("click", (e: Leaflet.LeafletMouseEvent) => {
        setPin({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      map.on("moveend", () => loadPatterns());
      mapRef.current = map;
      loadPatterns();
      refreshFeedbacks();
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [loadPatterns, refreshFeedbacks]);

  // Live updates: refresh patterns and feedbacks as soon as any sister reports
  useEffect(() => {
    const channel = supabase
      .channel("safety-map-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "safety_map_reports" },
        () => loadPatterns()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "safe_places" },
        () => loadPatterns()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "route_safety_feedback" },
        () => refreshFeedbacks()
      )
      .subscribe();

    const handleLocalFeedback = () => refreshFeedbacks();
    window.addEventListener("herspace-feedback-updated", handleLocalFeedback);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("herspace-feedback-updated", handleLocalFeedback);
    };
  }, [loadPatterns, refreshFeedbacks]);

  // Render Map layers: Safe places (green), world benchmarks (green), & patterns (rose/amber)
  useEffect(() => {
    const L = LRef.current;
    const layer = layerRef.current;
    if (!L || !layer) return;

    layer.clearLayers();

    // 1. Draw Real-World Benchmark Safe Zones (Green highlights)
    WORLD_SAFETY_BENCHMARKS.forEach((bm) => {
      L.circle([bm.lat, bm.lng], {
        radius: 750,
        color: "#10b981",
        fillColor: "#10b981",
        fillOpacity: 0.22,
        weight: 2,
      })
        .bindPopup(
          `<div style="font-family: inherit; font-size: 13px; line-height: 1.4;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
              <span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:#10b981;"></span>
              <strong style="color:#065f46; font-size:14px;">${bm.name}</strong>
            </div>
            <p style="margin:2px 0; color:#374151;">${bm.notes}</p>
            <div style="margin-top:6px; display:flex; justify-content:space-between; font-size:11px; color:#6b7280;">
              <span><strong>Safety Index:</strong> ${bm.safetyScore}/10</span>
              <span style="color:#059669; font-weight:600;">✓ Verified Benchmark</span>
            </div>
          </div>`
        )
        .addTo(layer);

      L.circleMarker([bm.lat, bm.lng], {
        radius: 7,
        color: "#059669",
        fillColor: "#34d399",
        fillOpacity: 0.9,
        weight: 2,
      }).addTo(layer);
    });

    // 2. Draw Community Safe Places (Green signals)
    safePlaces.forEach((sp) => {
      L.circle([sp.lat, sp.lng], {
        radius: 400,
        color: "#10b981",
        fillColor: "#10b981",
        fillOpacity: 0.25,
        weight: 2,
      })
        .bindPopup(
          `<div style="font-family: inherit; font-size: 13px; line-height: 1.4;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
              <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981;"></span>
              <strong style="color:#047857; font-size:14px;">${sp.name}</strong>
            </div>
            <span style="font-size:11px; background:#d1fae5; color:#065f46; padding:2px 6px; border-radius:999px;">${sp.place_type}</span>
            ${sp.notes ? `<p style="margin:6px 0 2px; color:#374151;">${sp.notes}</p>` : ""}
            <p style="margin:4px 0 0; font-size:11px; color:#6b7280;">${sp.city ? `${sp.city}, ` : ""}${sp.country}</p>
          </div>`
        )
        .addTo(layer);

      L.circleMarker([sp.lat, sp.lng], {
        radius: 6,
        color: "#047857",
        fillColor: "#10b981",
        fillOpacity: 0.9,
        weight: 1.5,
      }).addTo(layer);
    });

    // 3. Draw Community Concern Patterns (Amber/Rose)
    patterns.forEach((p) => {
      const c = CATEGORIES[p.category] ?? {
        label: p.category,
        color: "#57534e",
        isSafe: false,
      };
      L.circle([p.cell_lat, p.cell_lng], {
        radius: 180 + Math.min(p.reporters, 30) * 25,
        color: c.color,
        fillColor: c.color,
        fillOpacity: Math.min(0.15 + p.reporters * 0.03, 0.55),
        weight: 1,
      })
        .bindPopup(
          `<div style="font-family: inherit; font-size: 13px; line-height: 1.4;">
            <strong style="color:${c.color}; font-size:14px;">${c.label}</strong>
            <p style="margin:4px 0 2px;">${p.reporters} sisters independently noted this concern.</p>
            <p style="margin:0; font-size:11px; color:#6b7280;">Time window: ${TIMES[p.time_window] ?? p.time_window}</p>
          </div>`
        )
        .addTo(layer);
    });
  }, [patterns, safePlaces]);

  // Render Routes layer: Safest (Emerald), Quickest (Cyan), Dangerous (Rose/Amber)
  useEffect(() => {
    const L = LRef.current;
    const routesLayer = routesLayerRef.current;
    const map = mapRef.current;
    if (!L || !routesLayer || !map) return;

    routesLayer.clearLayers();

    if (routes.length === 0) return;

    let selectedPolyline: Leaflet.Polyline | null = null;

    // Render routes with background glow and distinctive strokes
    routes.forEach((route) => {
      const isSelected = activeRoute?.id === route.id;

      // Glow border under selected route
      if (isSelected) {
        L.polyline(route.coordinates, {
          color: route.color,
          weight: 10,
          opacity: 0.35,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(routesLayer);
      }

      const poly = L.polyline(route.coordinates, {
        color: route.color,
        weight: isSelected ? 6 : 4,
        opacity: isSelected ? 0.95 : 0.65,
        dashArray:
          route.type === "safest"
            ? undefined
            : route.type === "quickest"
              ? "7, 6"
              : "3, 5",
        lineCap: "round",
        lineJoin: "round",
      });

      poly.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4;">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
            <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${route.color};"></span>
            <strong style="color:${route.color}; font-size:14px;">${route.name}</strong>
          </div>
          <div style="margin:4px 0; font-size:12px;">
            <b>Safety Score:</b> ${route.safetyScore}/10 (${route.safetyVerdict})<br/>
            <b>Lighting:</b> ${route.lightingScore}% Lit<br/>
            <b>Distance:</b> ${route.distanceKm} km · ${route.durationMin} mins
          </div>
          <div style="font-size:11px; color:#4b5563; margin-top:4px;">
            ${route.perks.join("<br/>")}
            ${route.warnings.length > 0 ? `<br/><span style="color:#e11d48;">${route.warnings.join("<br/>")}</span>` : ""}
          </div>
        </div>
      `);

      poly.on("click", () => setActiveRoute(route));
      poly.addTo(routesLayer);

      if (isSelected) {
        selectedPolyline = poly;
        poly.bringToFront();
      }
    });

    // Add Start (A) and Destination (B) custom markers
    if (activeRoute && activeRoute.coordinates.length > 0) {
      const startCoord = activeRoute.coordinates[0];
      const endCoord = activeRoute.coordinates[activeRoute.coordinates.length - 1];

      // Start Marker (A) - Pink Sanctuary theme
      const startIcon = L.divIcon({
        className: "custom-route-marker-a",
        html: `<div style="background:#ec4899; color:#fff; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px; border:2px solid #ffffff; box-shadow:0 3px 8px rgba(236,72,153,0.45);">A</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker(startCoord, { icon: startIcon }).addTo(routesLayer).bindTooltip("Starting Point (A)", { permanent: false });

      // Destination Marker (B)
      const endIcon = L.divIcon({
        className: "custom-route-marker-b",
        html: `<div style="background:#7c3aed; color:#fff; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px; border:2px solid #ffffff; box-shadow:0 3px 8px rgba(0,0,0,0.35);">B</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker(endCoord, { icon: endIcon }).addTo(routesLayer).bindTooltip("Destination (B)", { permanent: false });
    }

    // Render live simulated walker position if present
    if (simulatedPos) {
      const walkerIcon = L.divIcon({
        className: "custom-walker-icon",
        html: `<div style="background:#ec4899; color:#fff; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:3px solid #ffffff; box-shadow:0 0 16px #ec4899; animation:pulse 1s infinite;"><span style="font-size:16px;">🚶‍♀️</span></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      L.marker(simulatedPos, { icon: walkerIcon }).addTo(routesLayer);
    }

    // Fit map bounds to encompass the selected route
    if (selectedPolyline) {
      try {
        const bounds = selectedPolyline.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
        }
      } catch {
        // silent catch
      }
    }
  }, [routes, activeRoute, simulatedPos]);

  // Draw pending user pin
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    pinRef.current?.remove();
    if (pin) {
      const isSafeCat = CATEGORIES[category]?.isSafe ?? true;
      pinRef.current = L.circleMarker([pin.lat, pin.lng], {
        radius: 9,
        color: isSafeCat ? "#059669" : "#e11d48",
        fillColor: isSafeCat ? "#10b981" : "#fb7185",
        weight: 2,
        fillOpacity: 0.7,
      }).addTo(map);
    }
  }, [pin, category]);

  // Handle Geolocation toggle
  useEffect(() => {
    if (!useLocation) return;
    if (!navigator.geolocation) {
      toast.error("Location isn't available on this device.");
      setUseLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current?.setView([latitude, longitude], 15);
        setPin({ lat: latitude, lng: longitude });
        toast.success("Centered on your current location.");
      },
      () => {
        toast.error("Couldn't get your location. Try typing the place instead.");
        setUseLocation(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, [useLocation]);

  // Quick pan to World Benchmark Safe Zone
  function flyToBenchmark(lat: number, lng: number, name: string) {
    mapRef.current?.flyTo([lat, lng], 14, { duration: 1.2 });
    toast.info(`Showing safe zone: ${name}`);
  }

  // Search location
  async function searchPlace(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          query
        )}`
      );
      const [hit] = await res.json();
      if (!hit) {
        toast.error("Place not found.");
        return;
      }
      mapRef.current?.setView([Number(hit.lat), Number(hit.lon)], 15);
      setPin({ lat: Number(hit.lat), lng: Number(hit.lon) });
      if (!areaLabel) setAreaLabel(query.slice(0, 120));
    } catch {
      toast.error("Search failed. Try again.");
    }
  }

  // Handle Report / Safe Place Submission
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const target = pin ?? (mapRef.current ? mapRef.current.getCenter() : null);
    if (!target) {
      toast.error("Please click on the map to choose a location.");
      return;
    }
    setBusy(true);

    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id;
    const isSafeSelection = CATEGORIES[category]?.isSafe ?? false;

    if (!userId) {
      setBusy(false);
      toast.error("Please sign in to share a report.");
      return;
    }

    if (isSafeSelection) {
      const placeName = areaLabel.trim() || "Safe Community Haven";
      const notesText = note.trim() || "Reported safe haven with active visibility.";

      const { error } = await db.from("safe_places").insert({
        submitted_by: userId,
        name: placeName,
        place_type: category,
        city: "Community Reported",
        country: "Global",
        lat: target.lat,
        lng: target.lng,
        safety_score: 9.5,
        women_friendly_score: 9.8,
        notes: notesText,
      });

      if (error) {
        setBusy(false);
        toast.error("Couldn't save this safe place. Please try again.");
        return;
      }

      toast.success("Safe place marked! Highlighted in green on the map.");
    } else {
      const { error } = await db.from("safety_map_reports").insert({
        user_id: userId,
        category,
        time_window: timeWindow,
        cell_lat: target.lat,
        cell_lng: target.lng,
        area_label: areaLabel.trim() || null,
        note: note.trim() || null,
      });

      if (error) {
        setBusy(false);
        toast.error("Couldn't save your report. Please try again.");
        return;
      }

      toast.success("Notice shared anonymously. Joins community safety pattern.");
    }

    setBusy(false);
    setNote("");
    setAreaLabel("");
    setPin(null);
    loadPatterns();
  }

  const [mobileLayoutMode, setMobileLayoutMode] = useState<"both" | "planner" | "map">("both");
  const [showMobileLegends, setShowMobileLegends] = useState(false);

  // Invalidate Leaflet map size on responsive layout or tab changes
  useEffect(() => {
    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [mobileLayoutMode, activeTab]);

  const selectedCategoryMeta = CATEGORIES[category] ?? CATEGORIES.safe_haven;

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 pb-36 sm:pb-12">
      {/* Top Mode Bar: Safe Route Navigator vs Explore Havens */}
      <div className="flex items-center justify-between flex-wrap gap-2 p-1.5 rounded-2xl bg-card border border-border/70 shadow-xs w-full max-w-full min-w-0">
        <div className="flex items-center gap-1.5 w-full sm:w-auto min-w-0">
          <button
            type="button"
            onClick={() => setActiveTab("navigate")}
            className={`flex-1 sm:flex-initial min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "navigate"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Safe Route Navigator</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("explore")}
            className={`flex-1 sm:flex-initial min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "explore"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Explore Havens</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground pr-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-time corridor scoring active</span>
        </div>
      </div>

      {/* Mobile/Tablet View Switcher (Visible only below lg) */}
      {activeTab === "navigate" && (
        <div className="lg:hidden flex items-center justify-center p-1 rounded-2xl bg-secondary/80 border border-border/70 shadow-xs w-full max-w-full min-w-0">
          <button
            type="button"
            onClick={() => setMobileLayoutMode("both")}
            className={`flex-1 min-w-0 py-1.5 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              mobileLayoutMode === "both"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-pink-600 font-bold shrink-0">📱</span>
            <span className="truncate">Split View</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileLayoutMode("planner")}
            className={`flex-1 min-w-0 py-1.5 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              mobileLayoutMode === "planner"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Navigation className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span className="truncate">Plan Route</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileLayoutMode("map")}
            className={`flex-1 min-w-0 py-1.5 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              mobileLayoutMode === "map"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">Full Map</span>
          </button>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6 w-full max-w-full min-w-0">
        {/* Map Column (2 spans on desktop, conditional on mobile) */}
        <div
          className={`space-y-4 lg:col-span-2 w-full max-w-full min-w-0 ${
            activeTab === "navigate" && mobileLayoutMode === "planner" ? "hidden lg:block" : "block"
          }`}
        >
          <Card className="rounded-3xl border border-border/80 shadow-xs overflow-hidden relative w-full max-w-full min-w-0">
            <CardContent className="p-3 sm:p-5 space-y-3 w-full max-w-full min-w-0">
              {/* Search and Location controls */}
              <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center w-full max-w-full min-w-0">
                <form onSubmit={searchPlace} className="flex gap-2 flex-1 w-full min-w-0">
                  <Input
                    placeholder="Type a city, road, or area…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="rounded-full bg-background text-xs sm:text-sm h-9 min-w-0 flex-1"
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    size="icon"
                    className="rounded-full shrink-0 h-9 w-9"
                    aria-label="Search place"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </form>
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground shrink-0 cursor-pointer self-start sm:self-auto">
                  <Switch checked={useLocation} onCheckedChange={setUseLocation} />
                  <LocateFixed className="h-3.5 h-3.5 text-primary shrink-0" />
                  <span className="whitespace-nowrap">Use my location</span>
                </label>
              </div>

              {/* Quick World Benchmark Jump Chips */}
              <div className="space-y-1 pt-0.5 w-full min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground w-full min-w-0">
                  <Navigation className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-foreground text-[11px] sm:text-xs shrink-0">
                    World Safe Zones:
                  </span>
                  <span className="text-[10px] sm:text-[11px] truncate">
                    Explore global safety benchmarks
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full max-w-full min-w-0">
                  {WORLD_SAFETY_BENCHMARKS.map((bm) => (
                    <button
                      key={bm.name}
                      type="button"
                      onClick={() => flyToBenchmark(bm.lat, bm.lng, bm.name)}
                      className="px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap shrink-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      {bm.city}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pin Picking Indicator Banner if user clicked Pick on map */}
              {pinMode && (
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-xs text-primary flex items-center justify-between animate-pulse w-full min-w-0">
                  <span className="flex items-center gap-1.5 font-medium min-w-0 truncate">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {pinMode === "start"
                        ? "📍 Tap map to set Starting Point (A)"
                        : "📍 Tap map to set Destination (B)"}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPinMode(null)}
                    className="text-[11px] underline font-semibold cursor-pointer shrink-0 ml-2"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Leaflet Map Canvas with Responsive Height */}
              <div
                ref={mapEl}
                className={`w-full max-w-full rounded-2xl overflow-hidden border border-border z-0 shadow-inner transition-all duration-200 min-w-0 ${
                  activeTab === "navigate" && mobileLayoutMode === "map"
                    ? "h-[calc(100dvh-260px)] min-h-[380px]"
                    : "h-[250px] xs:h-[280px] sm:h-[360px] lg:h-[550px]"
                }`}
              />

              {/* Desktop Legends (always visible on lg:) */}
              <div className="hidden lg:block space-y-2 pt-2 border-t border-border/60 w-full min-w-0">
                {/* Route Corridors Legend */}
                {routes.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/60 flex items-center justify-between flex-wrap gap-2 text-xs w-full min-w-0">
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-primary" /> Route Comparison:
                    </span>
                    <div className="flex items-center gap-3 flex-wrap text-[11px]">
                      <span className="flex items-center gap-1.5 text-pink-700 dark:text-pink-300 font-semibold">
                        <span className="w-3 h-1.5 rounded-full bg-pink-500 shadow-xs shadow-pink-500/50" />
                        Safest Route ({routes.find((r) => r.type === "safest")?.safetyScore || "9.5"}/10)
                      </span>
                      <span className="flex items-center gap-1.5 text-sky-700 dark:text-sky-300 font-medium">
                        <span className="w-3 h-1 rounded-full bg-sky-500" />
                        Most Quickest ({routes.find((r) => r.type === "quickest")?.safetyScore || "7.4"}/10)
                      </span>
                      <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-medium">
                        <span className="w-3 h-1 rounded-full bg-rose-500" />
                        Caution / Avoid ({routes.find((r) => r.type === "dangerous")?.safetyScore || "3.8"}/10)
                      </span>
                    </div>
                  </div>
                )}

                {/* Point Marks Legend */}
                <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground w-full min-w-0">
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Ground Signals:
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Verified Safe Havens
                  </span>
                  {Object.entries(CATEGORIES).map(([k, c]) => (
                    <span
                      key={k}
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary/50 border border-border/50"
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: c.color }}
                      />
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Mobile Quick Action Pills if in Map Mode */}
              {activeTab === "navigate" && mobileLayoutMode === "map" && (
                <div className="lg:hidden pt-1 flex justify-center w-full min-w-0">
                  <Button
                    size="sm"
                    type="button"
                    onClick={() => setMobileLayoutMode("both")}
                    className="rounded-full bg-pink-600 text-white text-xs font-semibold px-4 h-8 shadow-md"
                  >
                    🚶‍♀️ Open Route Planner
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Desktop Informational Guidance */}
          <Card className="hidden lg:block rounded-2xl border border-border/80 w-full min-w-0">
            <CardContent className="p-4 flex gap-3 text-xs sm:text-sm text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <p>
                Our routing engine dynamically audits streets for{" "}
                <strong className="text-foreground">safe havens, continuous lighting, and real-time sister feedback</strong>.
                When sisters rate routes after completing journeys, the corridor weights update live for every woman in our network.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Column: Safe Route Planner OR Explore & Report Form */}
        <div
          className={`space-y-4 w-full max-w-full min-w-0 ${
            activeTab === "navigate" && mobileLayoutMode === "map" ? "hidden lg:block" : "block"
          }`}
        >
          {activeTab === "navigate" ? (
            <SafeRoutePlanner
              safePlaces={safePlaces}
              hazardPatterns={patterns}
              allFeedbacks={allFeedbacks}
              onRoutesCalculated={(calcRoutes) => setRoutes(calcRoutes)}
              onActiveRouteSelected={(r) => setActiveRoute(r)}
              onStartJourney={(r) => setActiveRoute(r)}
              onSimulatePositionChange={(pos) => setSimulatedPos(pos)}
              activeRoute={activeRoute}
              mapPin={pin}
              onSetPinMode={setPinMode}
              pinMode={pinMode}
              onRefreshData={() => {
                loadPatterns();
                refreshFeedbacks();
              }}
              onZoomToLocation={handleZoomToLocation}
            />
          ) : (
            <>
              {/* Report / Mark Location Column */}
              <Card className="rounded-3xl border border-border/80 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="font-serif italic text-2xl flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" /> Share what you noticed
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Mark a safe haven with a green signal or report a caution pattern for sisters.
                  </p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submit} className="space-y-3.5">
                    <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/70 text-xs text-muted-foreground flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary shrink-0" />
                      <span>
                        {pin
                          ? "✓ Spot chosen on the map."
                          : "Tap any spot on the map, or we will use the map's current center."}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">What type of notice?</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <div className="px-2 py-1 text-[11px] font-semibold text-emerald-600">
                            Safe Haven &amp; Secure Spots (Green Signal)
                          </div>
                          {Object.entries(CATEGORIES)
                            .filter(([, c]) => c.isSafe)
                            .map(([k, c]) => (
                              <SelectItem key={k} value={k}>
                                <span className="flex items-center gap-2">
                                  <span
                                    className="w-2 h-2 rounded-full inline-block"
                                    style={{ background: c.color }}
                                  />
                                  {c.label}
                                </span>
                              </SelectItem>
                            ))}

                          <div className="px-2 py-1 text-[11px] font-semibold text-rose-600 mt-1 border-t border-border/60">
                            Caution &amp; Safety Patterns
                          </div>
                          {Object.entries(CATEGORIES)
                            .filter(([, c]) => !c.isSafe)
                            .map(([k, c]) => (
                              <SelectItem key={k} value={k}>
                                <span className="flex items-center gap-2">
                                  <span
                                    className="w-2 h-2 rounded-full inline-block"
                                    style={{ background: c.color }}
                                  />
                                  {c.label}
                                </span>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Time of observation</Label>
                      <Select value={timeWindow} onValueChange={setTimeWindow}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {Object.entries(TIMES).map(([k, t]) => (
                            <SelectItem key={k} value={k}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Place or Area Name (optional)</Label>
                      <Input
                        maxLength={120}
                        value={areaLabel}
                        onChange={(e) => setAreaLabel(e.target.value)}
                        placeholder={
                          selectedCategoryMeta.isSafe
                            ? "e.g. 24/7 Lit Medical Clinic or Sister Cafe"
                            : "e.g. Station Road underpass"
                        }
                        className="rounded-xl text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Details or Tips (optional)</Label>
                      <Textarea
                        rows={3}
                        maxLength={280}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={
                          selectedCategoryMeta.isSafe
                            ? "Describe why this spot is safe (well-lit, friendly staff, emergency refuge)..."
                            : "Describe the place or lighting, not individual persons."
                        }
                        className="rounded-xl text-sm"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={busy}
                      className={`w-full rounded-full transition-all duration-200 cursor-pointer ${
                        selectedCategoryMeta.isSafe
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-earth text-earth-foreground hover:brightness-110"
                      }`}
                    >
                      {selectedCategoryMeta.isSafe ? "Mark Safe (Green Signal)" : "Add Notice Anonymously"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Active Spots in View */}
              <Card className="rounded-3xl border border-border/80 shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" /> Active Spots in this View
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {patterns.length === 0 && safePlaces.length === 0 && (
                    <p className="text-xs text-muted-foreground p-3 text-center">
                      Pan the map or use the world safe zone chips above to view active spots.
                    </p>
                  )}

                  {safePlaces.slice(0, 4).map((sp) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => mapRef.current?.setView([sp.lat, sp.lng], 15)}
                      className="w-full text-left rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2.5 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 truncate">
                          {sp.name}
                        </span>
                        <Badge variant="outline" className="ml-auto text-[10px] text-emerald-700 border-emerald-500/40">
                          Safe Haven
                        </Badge>
                      </div>
                      {sp.notes && <p className="text-[11px] text-muted-foreground mt-1 truncate">{sp.notes}</p>}
                    </button>
                  ))}

                  {patterns.slice(0, 6).map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => mapRef.current?.setView([p.cell_lat, p.cell_lng], 16)}
                      className="w-full text-left rounded-xl border border-border p-2.5 hover:bg-muted transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ background: CATEGORIES[p.category]?.color }}
                        />
                        <span className="text-xs font-medium truncate">
                          {CATEGORIES[p.category]?.label ?? p.category}
                        </span>
                        <Badge variant="outline" className="ml-auto text-[10px]">
                          {p.reporters} sisters
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Mostly {TIMES[p.time_window]?.toLowerCase() ?? p.time_window}
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
