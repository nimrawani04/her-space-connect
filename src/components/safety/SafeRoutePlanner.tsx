import { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Zap,
  AlertTriangle,
  Navigation,
  MapPin,
  ArrowRightLeft,
  Search,
  LocateFixed,
  Play,
  CheckCircle2,
  Star,
  Sun,
  Users,
  MessageSquare,
  Sparkles,
  Clock,
  Compass,
  Footprints,
  Car,
  Globe,
  ChevronRight,
  Layers,
  Heart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  SafeRoutePoint,
  RouteOption,
  TripFeedback,
  calculateSafeRoutes,
  submitTripFeedback,
} from "@/lib/safe-routing";
import {
  GLOBAL_HIERARCHY_COUNTRIES,
  CountryInfo,
  StateInfo,
} from "@/lib/location-hierarchy";

type SafeRoutePlannerProps = {
  safePlaces: Array<{ id: string; name: string; lat: number; lng: number; place_type: string }>;
  hazardPatterns: Array<{ cell_lat: number; cell_lng: number; category: string; reporters: number }>;
  allFeedbacks: TripFeedback[];
  onRoutesCalculated: (routes: RouteOption[]) => void;
  onActiveRouteSelected: (route: RouteOption) => void;
  onStartJourney: (route: RouteOption) => void;
  onSimulatePositionChange: (pos: [number, number] | null) => void;
  activeRoute: RouteOption | null;
  mapPin: { lat: number; lng: number } | null;
  onSetPinMode: (mode: "start" | "end" | "report" | null) => void;
  pinMode: "start" | "end" | "report" | null;
  onRefreshData: () => void;
  onZoomToLocation?: (lat: number, lng: number, zoom: number, label?: string) => void;
};

export default function SafeRoutePlanner({
  safePlaces,
  hazardPatterns,
  allFeedbacks,
  onRoutesCalculated,
  onActiveRouteSelected,
  onStartJourney,
  onSimulatePositionChange,
  activeRoute,
  mapPin,
  onSetPinMode,
  pinMode,
  onRefreshData,
  onZoomToLocation,
}: SafeRoutePlannerProps) {
  // Country & State Hierarchy state
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(
    GLOBAL_HIERARCHY_COUNTRIES[0] // India by default
  );
  const [selectedState, setSelectedState] = useState<StateInfo>(
    GLOBAL_HIERARCHY_COUNTRIES[0].states[0] // Delhi / NCR by default
  );
  const [hierarchyStep, setHierarchyStep] = useState<1 | 2 | 3>(3);
  const [customCountryQuery, setCustomCountryQuery] = useState("");
  const [customStateQuery, setCustomStateQuery] = useState("");

  // Origin & Destination points
  const initialPlace = selectedState.samplePlaces?.[0];
  const [startPoint, setStartPoint] = useState<SafeRoutePoint>({
    lat: initialPlace?.startCoord[0] || 28.694,
    lng: initialPlace?.startCoord[1] || 77.208,
    label: initialPlace?.startName || "North Campus Metro Station",
  });
  const [endPoint, setEndPoint] = useState<SafeRoutePoint>({
    lat: initialPlace?.endCoord[0] || 28.701,
    lng: initialPlace?.endCoord[1] || 77.215,
    label: initialPlace?.endName || "University Women's Hostel Sanctuary",
  });

  const [startQuery, setStartQuery] = useState(startPoint.label || "");
  const [endQuery, setEndQuery] = useState(endPoint.label || "");
  const [transportMode, setTransportMode] = useState<"foot" | "driving">("foot");
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  // Active Journey state
  const [isJourneyActive, setIsJourneyActive] = useState(false);
  const [journeyProgress, setJourneyProgress] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);

  // Post-trip feedback modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [tripCompletedRoute, setTripCompletedRoute] = useState<RouteOption | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackFeltSafe, setFeedbackFeltSafe] = useState<boolean>(true);
  const [feedbackLighting, setFeedbackLighting] = useState<"bright" | "moderate" | "poor" | "dark">("bright");
  const [feedbackCrowd, setFeedbackCrowd] = useState<"crowded" | "moderate" | "deserted">("moderate");
  const [feedbackHazards, setFeedbackHazards] = useState<string[]>([]);
  const [feedbackSafeSpots, setFeedbackSafeSpots] = useState<string[]>([]);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Sync clicked map pin with start or end point depending on pinMode
  useEffect(() => {
    if (!mapPin || !pinMode) return;
    if (pinMode === "start") {
      const p = {
        lat: mapPin.lat,
        lng: mapPin.lng,
        label: `Map Point (${mapPin.lat.toFixed(4)}, ${mapPin.lng.toFixed(4)})`,
      };
      setStartPoint(p);
      setStartQuery(p.label);
      onSetPinMode(null);
      toast.success("Start point set from map.");
    } else if (pinMode === "end") {
      const p = {
        lat: mapPin.lat,
        lng: mapPin.lng,
        label: `Destination (${mapPin.lat.toFixed(4)}, ${mapPin.lng.toFixed(4)})`,
      };
      setEndPoint(p);
      setEndQuery(p.label);
      onSetPinMode(null);
      toast.success("Destination set from map.");
    }
  }, [mapPin, pinMode, onSetPinMode]);

  // Recalculate routes whenever points, places, hazard patterns, or real-time feedbacks update
  async function computeRoutes(
    start: SafeRoutePoint = startPoint,
    end: SafeRoutePoint = endPoint,
    mode: "foot" | "driving" = transportMode
  ) {
    if (!start || !end) return;
    setLoadingRoutes(true);
    try {
      const generated = await calculateSafeRoutes(
        start,
        end,
        safePlaces,
        hazardPatterns,
        allFeedbacks,
        mode
      );
      setRoutes(generated);
      onRoutesCalculated(generated);
      // Default to safest route (Pink)
      const safest = generated.find((r) => r.type === "safest") || generated[0];
      if (safest) {
        onActiveRouteSelected(safest);
      }
    } catch {
      toast.error("Could not calculate routes. Check points and try again.");
    } finally {
      setLoadingRoutes(false);
    }
  }

  // Initial computation
  useEffect(() => {
    computeRoutes(startPoint, endPoint, transportMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFeedbacks.length, safePlaces.length, hazardPatterns.length]);

  // Step 1: Handle Country Selection & Zoom
  function handleSelectCountry(country: CountryInfo) {
    setSelectedCountry(country);
    // Auto select first state of this country
    const firstState = country.states[0];
    if (firstState) {
      setSelectedState(firstState);
      const place = firstState.samplePlaces?.[0];
      if (place) {
        const sp = { lat: place.startCoord[0], lng: place.startCoord[1], label: place.startName };
        const ep = { lat: place.endCoord[0], lng: place.endCoord[1], label: place.endName };
        setStartPoint(sp);
        setEndPoint(ep);
        setStartQuery(sp.label);
        setEndQuery(ep.label);
      }
    }
    setHierarchyStep(2);

    // Zoom map smoothly to country
    if (onZoomToLocation) {
      onZoomToLocation(country.lat, country.lng, country.zoom, country.name);
    }
    toast.info(`Zooming to ${country.flag} ${country.name}. Now choose a State/Region.`);
  }

  // Step 2: Handle State Selection & Zoom
  function handleSelectState(state: StateInfo) {
    setSelectedState(state);
    setHierarchyStep(3);

    // Update start & end to sample places if available
    if (state.samplePlaces && state.samplePlaces.length > 0) {
      const place = state.samplePlaces[0];
      const sp = { lat: place.startCoord[0], lng: place.startCoord[1], label: place.startName };
      const ep = { lat: place.endCoord[0], lng: place.endCoord[1], label: place.endName };
      setStartPoint(sp);
      setEndPoint(ep);
      setStartQuery(sp.label);
      setEndQuery(ep.label);
      computeRoutes(sp, ep);
    }

    // Zoom map smoothly to state
    if (onZoomToLocation) {
      onZoomToLocation(state.lat, state.lng, state.zoom, state.name);
    }
    toast.info(`Zooming to 📍 ${state.name}. Choose your start and end places.`);
  }

  // Step 3: Handle sample corridor selection
  function handleApplySampleCorridor(sample: NonNullable<StateInfo["samplePlaces"]>[number]) {
    const sp: SafeRoutePoint = {
      lat: sample.startCoord[0],
      lng: sample.startCoord[1],
      label: sample.startName,
    };
    const ep: SafeRoutePoint = {
      lat: sample.endCoord[0],
      lng: sample.endCoord[1],
      label: sample.endName,
    };
    setStartPoint(sp);
    setEndPoint(ep);
    setStartQuery(sp.label || "");
    setEndQuery(ep.label || "");

    // Zoom map directly to place
    if (onZoomToLocation) {
      onZoomToLocation(sp.lat, sp.lng, 15, sample.name);
    }
    computeRoutes(sp, ep);
    toast.success(`Loaded corridor: ${sample.name}`);
  }

  // Geocode address search scoped to selected state and country
  async function searchLocation(text: string, isStart: boolean) {
    if (!text.trim()) return;
    try {
      // Scope query with state and country for precision
      const contextQuery = `${text}, ${selectedState ? selectedState.name + ", " : ""}${selectedCountry.name}`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          contextQuery
        )}`
      );
      let data = await res.json();

      // Fallback to raw text search if scoped search yielded nothing
      if (!data || data.length === 0) {
        const fallbackRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(text)}`
        );
        data = await fallbackRes.json();
      }

      if (!data || data.length === 0) {
        toast.error("Location not found. Try typing another place.");
        return;
      }

      const hit = data[0];
      const newPoint: SafeRoutePoint = {
        lat: Number(hit.lat),
        lng: Number(hit.lon),
        label: hit.display_name.split(",").slice(0, 2).join(","),
      };

      if (isStart) {
        setStartPoint(newPoint);
        setStartQuery(newPoint.label || text);
        if (onZoomToLocation) {
          onZoomToLocation(newPoint.lat, newPoint.lng, 15, newPoint.label);
        }
        computeRoutes(newPoint, endPoint);
      } else {
        setEndPoint(newPoint);
        setEndQuery(newPoint.label || text);
        if (onZoomToLocation) {
          onZoomToLocation(newPoint.lat, newPoint.lng, 15, newPoint.label);
        }
        computeRoutes(startPoint, newPoint);
      }
      toast.success(`Set ${isStart ? "Start" : "Destination"}: ${newPoint.label}`);
    } catch {
      toast.error("Search failed. Try another place.");
    }
  }

  // Custom Country Geocode Search
  async function searchCustomCountry() {
    if (!customCountryQuery.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          customCountryQuery
        )}`
      );
      const data = await res.json();
      if (!data || data.length === 0) {
        toast.error("Country not found.");
        return;
      }
      const hit = data[0];
      const customCountry: CountryInfo = {
        name: hit.display_name.split(",")[0],
        code: "GL",
        flag: "🌍",
        lat: Number(hit.lat),
        lng: Number(hit.lon),
        zoom: 5,
        states: [
          {
            name: `${hit.display_name.split(",")[0]} Central`,
            lat: Number(hit.lat),
            lng: Number(hit.lon),
            zoom: 9,
          },
        ],
      };
      handleSelectCountry(customCountry);
    } catch {
      toast.error("Search failed.");
    }
  }

  // Custom State Geocode Search
  async function searchCustomState() {
    if (!customStateQuery.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          `${customStateQuery}, ${selectedCountry.name}`
        )}`
      );
      const data = await res.json();
      if (!data || data.length === 0) {
        toast.error("State / Region not found.");
        return;
      }
      const hit = data[0];
      const customState: StateInfo = {
        name: hit.display_name.split(",")[0],
        lat: Number(hit.lat),
        lng: Number(hit.lon),
        zoom: 9,
      };
      handleSelectState(customState);
    } catch {
      toast.error("Search failed.");
    }
  }

  // Use current GPS location as start point
  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p: SafeRoutePoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "My Current GPS Location",
        };
        setStartPoint(p);
        setStartQuery(p.label || "");
        if (onZoomToLocation) {
          onZoomToLocation(p.lat, p.lng, 15, "Current GPS Location");
        }
        computeRoutes(p, endPoint);
        toast.success("Start point set to your current GPS location.");
      },
      () => {
        toast.error("Couldn't retrieve current location. Check browser permissions.");
      },
      { timeout: 8000 }
    );
  }

  // Swap start and end
  function swapPoints() {
    const prevStart = startPoint;
    const prevEnd = endPoint;
    setStartPoint(prevEnd);
    setEndPoint(prevStart);
    setStartQuery(prevEnd.label || "");
    setEndQuery(prevStart.label || "");
    computeRoutes(prevEnd, prevStart);
    toast.info("Start and Destination reversed.");
  }

  // Start journey navigation
  function handleStartJourneyClick(route: RouteOption) {
    setIsJourneyActive(true);
    setJourneyProgress(0);
    onStartJourney(route);
    toast.success("💖 Safe Journey Guardian active! Escorting you on verified path.");
  }

  // Simulated walking animation along the polyline
  useEffect(() => {
    if (!isJourneyActive || !isSimulating || !activeRoute) return;

    const coords = activeRoute.coordinates;
    if (coords.length < 2) return;

    const interval = setInterval(() => {
      setJourneyProgress((prev) => {
        const next = prev + 3;
        if (next >= 100) {
          clearInterval(interval);
          setIsSimulating(false);
          onSimulatePositionChange(coords[coords.length - 1]);
          toast.success("🎉 You have reached your destination safely!");
          handleEndJourney();
          return 100;
        }
        const idx = Math.min(
          coords.length - 1,
          Math.floor((next / 100) * (coords.length - 1))
        );
        onSimulatePositionChange(coords[idx]);
        return next;
      });
    }, 450);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJourneyActive, isSimulating, activeRoute]);

  // End journey & open feedback
  function handleEndJourney() {
    setIsJourneyActive(false);
    setIsSimulating(false);
    onSimulatePositionChange(null);
    setTripCompletedRoute(activeRoute);
    setShowFeedbackModal(true);
  }

  // Submit post-trip feedback
  async function handleSubmitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!tripCompletedRoute) return;
    setSubmittingFeedback(true);

    try {
      await submitTripFeedback({
        start_lat: startPoint.lat,
        start_lng: startPoint.lng,
        start_name: startPoint.label || null,
        end_lat: endPoint.lat,
        end_lng: endPoint.lng,
        end_name: endPoint.label || null,
        route_type: tripCompletedRoute.type,
        route_title: tripCompletedRoute.name,
        safety_rating: feedbackRating,
        felt_safe: feedbackFeltSafe,
        lighting_level: feedbackLighting,
        crowd_level: feedbackCrowd,
        hazards: feedbackHazards,
        safe_spots: feedbackSafeSpots,
        comment: feedbackComment.trim() || null,
      });

      toast.success(
        "✨ Feedback saved! Route safety scores for this corridor updated in real time for all sisters."
      );
      setShowFeedbackModal(false);
      setFeedbackComment("");
      setFeedbackHazards([]);
      setFeedbackSafeSpots([]);
      onRefreshData();
      // Recalculate routes with newly added feedback
      computeRoutes(startPoint, endPoint);
    } catch {
      toast.error("Couldn't save feedback. Please try again.");
    } finally {
      setSubmittingFeedback(false);
    }
  }

  const sisterFeedbackStats = useMemo(() => {
    return allFeedbacks.length;
  }, [allFeedbacks]);

  return (
    <div className="space-y-4">
      {/* 3-Step Hierarchical Location Navigator */}
      <Card className="rounded-3xl border border-border/80 shadow-xs bg-card/95 backdrop-blur-md overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Navigation className="w-4 h-4 text-pink-600" /> Location &amp; Safe Route
            </CardTitle>
            <Badge
              variant="outline"
              className="text-[11px] font-medium bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/30 flex items-center gap-1"
            >
              <Heart className="w-3 h-3 fill-pink-500 text-pink-500" />
              Pink = Safest Corridor
            </Badge>
          </div>

          {/* Stepper Navigation Indicator */}
          <div className="flex items-center gap-1 pt-2">
            <button
              type="button"
              onClick={() => setHierarchyStep(1)}
              className={`flex-1 text-left px-2 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                hierarchyStep === 1
                  ? "bg-pink-600 text-white border-pink-700 shadow-xs"
                  : "bg-secondary text-foreground hover:bg-secondary/80 border-border"
              }`}
            >
              <span className="block text-[10px] opacity-80 uppercase">Step 1</span>
              <span className="truncate block">
                {selectedCountry.flag} {selectedCountry.name}
              </span>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />

            <button
              type="button"
              onClick={() => setHierarchyStep(2)}
              className={`flex-1 text-left px-2 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                hierarchyStep === 2
                  ? "bg-pink-600 text-white border-pink-700 shadow-xs"
                  : "bg-secondary text-foreground hover:bg-secondary/80 border-border"
              }`}
            >
              <span className="block text-[10px] opacity-80 uppercase">Step 2</span>
              <span className="truncate block">📍 {selectedState.name}</span>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />

            <button
              type="button"
              onClick={() => setHierarchyStep(3)}
              className={`flex-1 text-left px-2 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                hierarchyStep === 3
                  ? "bg-pink-600 text-white border-pink-700 shadow-xs"
                  : "bg-secondary text-foreground hover:bg-secondary/80 border-border"
              }`}
            >
              <span className="block text-[10px] opacity-80 uppercase">Step 3</span>
              <span className="truncate block">🚶‍♀️ Routes</span>
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* STEP 1: Select Country View */}
          {hierarchyStep === 1 && (
            <div className="space-y-3 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-pink-600" /> 1. Select Country (Map zooms automatically)
                </span>
              </div>

              {/* Country Chips Grid */}
              <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                {GLOBAL_HIERARCHY_COUNTRIES.map((country) => {
                  const isSelected = selectedCountry.name === country.name;
                  return (
                    <button
                      key={country.name}
                      type="button"
                      onClick={() => handleSelectCountry(country)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-pink-500/10 border-pink-500 text-pink-700 dark:text-pink-300 font-semibold ring-1 ring-pink-500/40"
                          : "bg-secondary/60 hover:bg-secondary border-border/80 text-foreground"
                      }`}
                    >
                      <span className="text-lg">{country.flag}</span>
                      <span className="truncate">{country.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Or Search Custom Country */}
              <div className="pt-2 border-t border-border/60 space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Or search any other country worldwide:
                </label>
                <div className="flex gap-2">
                  <Input
                    value={customCountryQuery}
                    onChange={(e) => setCustomCountryQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchCustomCountry()}
                    placeholder="e.g. France, Sweden, Brazil..."
                    className="h-8 text-xs rounded-xl bg-background"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={searchCustomCountry}
                    className="h-8 px-2.5 rounded-xl text-xs"
                  >
                    Zoom
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Select State View */}
          {hierarchyStep === 2 && (
            <div className="space-y-3 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-pink-600" /> 2. Select State in {selectedCountry.name}
                </span>
                <button
                  type="button"
                  onClick={() => setHierarchyStep(1)}
                  className="text-[11px] text-pink-600 hover:underline cursor-pointer"
                >
                  Change Country
                </button>
              </div>

              {/* States list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                {selectedCountry.states.map((st) => {
                  const isSelected = selectedState.name === st.name;
                  return (
                    <button
                      key={st.name}
                      type="button"
                      onClick={() => handleSelectState(st)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-medium flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-pink-500/10 border-pink-500 text-pink-700 dark:text-pink-300 font-semibold ring-1 ring-pink-500/40"
                          : "bg-secondary/60 hover:bg-secondary border-border/80 text-foreground"
                      }`}
                    >
                      <span className="truncate">📍 {st.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">Zoom ➔</span>
                    </button>
                  );
                })}
              </div>

              {/* Or Search Custom State */}
              <div className="pt-2 border-t border-border/60 space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Or search custom state / province in {selectedCountry.name}:
                </label>
                <div className="flex gap-2">
                  <Input
                    value={customStateQuery}
                    onChange={(e) => setCustomStateQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchCustomState()}
                    placeholder="e.g. Goa, Texas, Bavaria, Kyoto..."
                    className="h-8 text-xs rounded-xl bg-background"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={searchCustomState}
                    className="h-8 px-2.5 rounded-xl text-xs"
                  >
                    Zoom
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Place & Corridors (Start & End) View */}
          {hierarchyStep === 3 && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              {/* Region Context Bar with Breadcrumb Buttons */}
              <div className="p-2 rounded-xl bg-secondary/50 border border-border/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-base">{selectedCountry.flag}</span>
                  <span className="font-semibold text-foreground truncate">
                    {selectedState.name}, {selectedCountry.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setHierarchyStep(1)}
                    className="text-[11px] text-pink-600 hover:underline cursor-pointer"
                  >
                    Change Area
                  </button>
                </div>
              </div>

              {/* Popular Curated Safe Corridors in this state */}
              {selectedState.samplePlaces && selectedState.samplePlaces.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-pink-500" /> Popular Corridors in {selectedState.name}:
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {selectedState.samplePlaces.map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplySampleCorridor(sample)}
                        className="px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap bg-secondary hover:bg-pink-500/10 hover:border-pink-500/40 border border-border/70 transition-all font-medium text-foreground flex items-center gap-1 cursor-pointer"
                      >
                        <Heart className="w-3 h-3 text-pink-500" />
                        {sample.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Start & Destination inputs with Pin picking */}
              <div className="space-y-3 relative">
                {/* Start Point Input */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold flex items-center gap-1 text-pink-700 dark:text-pink-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block shadow-xs shadow-pink-500/50" />
                      Starting Point (A)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={useCurrentLocation}
                        className="text-[11px] text-pink-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <LocateFixed className="w-3 h-3" /> GPS Location
                      </button>
                      <button
                        type="button"
                        onClick={() => onSetPinMode(pinMode === "start" ? null : "start")}
                        className={`text-[11px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                          pinMode === "start"
                            ? "bg-pink-600 text-white border-pink-700"
                            : "text-muted-foreground border-border hover:bg-secondary"
                        }`}
                      >
                        {pinMode === "start" ? "Tap map now" : "Pick on map"}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={startQuery}
                      onChange={(e) => setStartQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchLocation(startQuery, true)}
                      placeholder={`Enter start place in ${selectedState.name}…`}
                      className="text-xs h-9 rounded-xl bg-background"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => searchLocation(startQuery, true)}
                      className="h-9 px-2.5 rounded-xl shrink-0"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Swap Button Divider */}
                <div className="flex items-center justify-center -my-1">
                  <button
                    type="button"
                    onClick={swapPoints}
                    className="w-7 h-7 rounded-full bg-secondary hover:bg-pink-600 hover:text-white border border-border shadow-xs flex items-center justify-center transition-all cursor-pointer"
                    title="Reverse Start & Destination"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                  </button>
                </div>

                {/* Destination Input */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold flex items-center gap-1 text-purple-700 dark:text-purple-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block shadow-xs shadow-purple-500/50" />
                      Destination (B)
                    </label>
                    <button
                      type="button"
                      onClick={() => onSetPinMode(pinMode === "end" ? null : "end")}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                        pinMode === "end"
                          ? "bg-purple-600 text-white border-purple-700"
                          : "text-muted-foreground border-border hover:bg-secondary"
                      }`}
                    >
                      {pinMode === "end" ? "Tap map now" : "Pick on map"}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={endQuery}
                      onChange={(e) => setEndQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchLocation(endQuery, false)}
                      placeholder={`Enter destination place in ${selectedState.name}…`}
                      className="text-xs h-9 rounded-xl bg-background"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => searchLocation(endQuery, false)}
                      className="h-9 px-2.5 rounded-xl shrink-0"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Mode & Recalculate */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1 bg-secondary/80 p-0.5 rounded-xl border border-border/60">
                  <button
                    type="button"
                    onClick={() => {
                      setTransportMode("foot");
                      computeRoutes(startPoint, endPoint, "foot");
                    }}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      transportMode === "foot"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Footprints className="w-3.5 h-3.5 text-pink-600" /> Walking
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTransportMode("driving");
                      computeRoutes(startPoint, endPoint, "driving");
                    }}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      transportMode === "driving"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Car className="w-3.5 h-3.5" /> Driving / Cab
                  </button>
                </div>

                <Button
                  size="sm"
                  type="button"
                  disabled={loadingRoutes}
                  onClick={() => computeRoutes()}
                  className="rounded-xl h-8 text-xs font-semibold px-3 bg-pink-600 hover:bg-pink-700 text-white cursor-pointer"
                >
                  {loadingRoutes ? "Analyzing..." : "Find Routes"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Journey HUD if user started trip */}
      {isJourneyActive && activeRoute && (
        <Card className="rounded-3xl border-2 border-pink-500/80 bg-pink-500/5 shadow-md overflow-hidden animate-in fade-in-50">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-pink-500 animate-ping" />
                <span className="font-semibold text-sm text-pink-800 dark:text-pink-300">
                  Guardian Active: {activeRoute.name}
                </span>
              </div>
              <Badge className="bg-pink-600 text-white text-xs">
                {activeRoute.safetyScore}/10 Safe
              </Badge>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Journey Progress</span>
                <span className="font-mono font-medium">{journeyProgress}%</span>
              </div>
              <Progress value={journeyProgress} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-card border border-border/80 flex items-center gap-2">
                <Clock className="w-4 h-4 text-pink-600 shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Estimated Time</p>
                  <p className="font-semibold">{activeRoute.durationMin} mins</p>
                </div>
              </div>
              <div className="p-2 rounded-xl bg-card border border-border/80 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-pink-600 shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Safe Havens</p>
                  <p className="font-semibold">{activeRoute.safeHavensCount} on path</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => setIsSimulating(!isSimulating)}
                className="flex-1 rounded-xl text-xs h-9 cursor-pointer"
              >
                {isSimulating ? "Pause Walk Simulation" : "Simulate Walk Progress"}
              </Button>
              <Button
                size="sm"
                type="button"
                onClick={handleEndJourney}
                className="flex-1 rounded-xl text-xs h-9 bg-pink-600 hover:bg-pink-700 text-white font-semibold cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> End Trip &amp; Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Route Options Comparison Cards: Pink represents Safest */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span className="font-semibold text-foreground flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-pink-600" /> Corridors (Pink = Safest):
          </span>
          <span>{sisterFeedbackStats} Sister Reviews Loaded</span>
        </div>

        {routes.map((r) => {
          const isSelected = activeRoute?.id === r.id;
          const isSafest = r.type === "safest";
          const isQuickest = r.type === "quickest";
          const isDangerous = r.type === "dangerous";

          return (
            <div
              key={r.id}
              onClick={() => onActiveRouteSelected(r)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? isSafest
                    ? "border-pink-500 bg-pink-500/10 shadow-sm ring-2 ring-pink-500/60"
                    : isQuickest
                      ? "border-sky-500 bg-sky-500/10 shadow-sm ring-1 ring-sky-500/50"
                      : "border-rose-500 bg-rose-500/10 shadow-sm ring-1 ring-rose-500/50"
                  : "border-border/70 bg-card hover:bg-secondary/40"
              }`}
            >
              {/* Header with Title and Score */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isSafest && (
                      <Badge className="bg-pink-600 hover:bg-pink-700 text-white text-[10px] font-semibold flex items-center gap-1 shadow-xs">
                        <Heart className="w-3 h-3 fill-current" /> Recommended Safest (Pink)
                      </Badge>
                    )}
                    {isQuickest && (
                      <Badge className="bg-sky-600 text-white text-[10px] font-semibold flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Most Quickest
                      </Badge>
                    )}
                    {isDangerous && (
                      <Badge className="bg-rose-600 text-white text-[10px] font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Caution / Avoid
                      </Badge>
                    )}
                    {r.sisterVerified && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-pink-500/40 text-pink-700 dark:text-pink-300"
                      >
                        ✓ Sister Verified
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-semibold text-sm text-foreground pt-0.5">{r.name}</h4>
                  <p className="text-xs text-muted-foreground">{r.safetyVerdict}</p>
                </div>

                {/* Score Pill */}
                <div
                  className={`px-2.5 py-1 rounded-xl text-center shrink-0 border ${
                    isSafest
                      ? "bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/40 font-bold"
                      : r.safetyScore >= 6.5
                        ? "bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/40"
                        : "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40"
                  }`}
                >
                  <p className="text-base font-bold font-mono leading-none">{r.safetyScore}</p>
                  <p className="text-[9px] uppercase font-semibold tracking-wider mt-0.5">Safety</p>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 py-2 my-1 border-y border-border/50 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Distance &amp; ETA</span>
                  <span className="font-semibold text-foreground">
                    {r.distanceKm} km · {r.durationMin}m
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Street Lighting</span>
                  <span
                    className={`font-semibold ${
                      r.lightingScore >= 80
                        ? "text-pink-600 dark:text-pink-400"
                        : r.lightingScore >= 60
                          ? "text-sky-600"
                          : "text-rose-600"
                    }`}
                  >
                    {r.lightingScore}% Lit
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Sister Audits</span>
                  <span className="font-semibold text-foreground">
                    {r.feedbackCount > 0 ? `${r.feedbackCount} reviews` : "Active corridor"}
                  </span>
                </div>
              </div>

              {/* Perks & Warnings bullets */}
              <div className="space-y-1 text-[11px] pt-1">
                {r.perks.slice(0, 2).map((perk, idx) => (
                  <p key={idx} className="text-pink-700 dark:text-pink-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />
                    {perk}
                  </p>
                ))}
                {r.warnings.slice(0, 2).map((warn, idx) => (
                  <p key={idx} className="text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    {warn}
                  </p>
                ))}
              </div>

              {/* Action Button */}
              <div className="pt-3 flex items-center justify-end">
                <Button
                  size="sm"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartJourneyClick(r);
                  }}
                  className={`rounded-xl text-xs font-semibold h-8 px-4 cursor-pointer ${
                    isSafest
                      ? "bg-pink-600 hover:bg-pink-700 text-white"
                      : isQuickest
                        ? "bg-sky-600 hover:bg-sky-700 text-white"
                        : "bg-rose-600 hover:bg-rose-700 text-white"
                  }`}
                >
                  <Play className="w-3 h-3 mr-1 fill-current" />
                  Start Trip on this Route
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Post-Trip Feedback Dialog */}
      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
              <DialogTitle className="font-serif italic text-2xl">
                How was your journey, sister?
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Your feedback is recorded live and directly updates safety weights for all women
              navigating this route.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitFeedback} className="space-y-4 pt-2">
            {/* Star Rating */}
            <div className="space-y-1.5 text-center p-3 rounded-2xl bg-secondary/40 border border-border/70">
              <label className="text-xs font-semibold block text-foreground">
                Overall Route Safety Score
              </label>
              <div className="flex items-center justify-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackRating(star)}
                    className="p-1 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= feedbackRating
                          ? "text-amber-500 fill-amber-500"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {feedbackRating === 5
                  ? "5/5 · Felt completely safe & secure"
                  : feedbackRating >= 4
                    ? "4/5 · Generally safe and peaceful"
                    : feedbackRating >= 3
                      ? "3/5 · Moderate, needed extra vigilance"
                      : "1-2/5 · Uncomfortable / Flag concerns"}
              </span>
            </div>

            {/* Street Lighting selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-500" /> Street Lighting Quality
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "bright", label: "Well-Lit ☀️" },
                  { id: "moderate", label: "Adequate 🌤️" },
                  { id: "dark", label: "Poor / Dark 🌑" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onClick={() => setFeedbackLighting(item.id as any)}
                    className={`py-2 px-1 text-xs rounded-xl border text-center transition-all cursor-pointer font-medium ${
                      feedbackLighting === item.id
                        ? "bg-pink-600 text-white border-pink-700 font-semibold"
                        : "bg-card border-border hover:bg-secondary text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Foot Traffic & Open shops */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-pink-600" /> Foot Traffic &amp; Open Shops
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "crowded", label: "Lively Crowd" },
                  { id: "moderate", label: "Moderate" },
                  { id: "deserted", label: "Deserted" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onClick={() => setFeedbackCrowd(item.id as any)}
                    className={`py-2 px-1 text-xs rounded-xl border text-center transition-all cursor-pointer font-medium ${
                      feedbackCrowd === item.id
                        ? "bg-pink-600 text-white border-pink-700 font-semibold"
                        : "bg-card border-border hover:bg-secondary text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Safety tags encountered */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold block">
                Quick Tags (What did you encounter?)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "safe_haven_open", label: "✓ Safe 24/7 Haven", isSafe: true },
                  { id: "police_patrol", label: "✓ Police / Guards present", isSafe: true },
                  { id: "women_friendly", label: "✓ Open female-friendly cafe", isSafe: true },
                  { id: "poorly_lit", label: "⚠️ Dark / broken streetlamp", isSafe: false },
                  { id: "harassment", label: "⚠️ Catcalling / Loitering", isSafe: false },
                  { id: "isolated", label: "⚠️ Deserted cut-through", isSafe: false },
                ].map((t) => {
                  const isChecked = t.isSafe
                    ? feedbackSafeSpots.includes(t.id)
                    : feedbackHazards.includes(t.id);

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        if (t.isSafe) {
                          setFeedbackSafeSpots((prev) =>
                            prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id]
                          );
                        } else {
                          setFeedbackHazards((prev) =>
                            prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id]
                          );
                        }
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                        isChecked
                          ? t.isSafe
                            ? "bg-pink-600 text-white border-pink-700 font-semibold"
                            : "bg-rose-500 text-white border-rose-600 font-semibold"
                          : "bg-secondary text-muted-foreground border-border/80 hover:text-foreground"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sister Note */}
            <div className="space-y-1">
              <label className="text-xs font-semibold flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-pink-600" /> Advice for other sisters (Optional)
              </label>
              <Textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="e.g. Well-lit until 10 PM, cross on the left side of the road where the 24/7 store is."
                className="text-xs rounded-xl min-h-[70px] resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={submittingFeedback}
              className="w-full rounded-2xl h-10 text-sm font-semibold bg-pink-600 hover:bg-pink-700 text-white cursor-pointer"
            >
              {submittingFeedback ? "Updating Safety Scores..." : "Submit & Update Route Live"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
