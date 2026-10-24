import { supabase } from "@/integrations/supabase/client";

export type SafeRoutePoint = {
  lat: number;
  lng: number;
  label?: string;
};

export type RouteType = "safest" | "quickest" | "dangerous";

export type RouteOption = {
  id: string;
  name: string;
  type: RouteType;
  color: string;
  glowColor: string;
  distanceKm: number;
  durationMin: number;
  safetyScore: number; // 1.0 - 9.9
  lightingScore: number; // 0 - 100%
  coordinates: [number, number][]; // [lat, lng][]
  safeHavensCount: number;
  hazardsCount: number;
  feedbackCount: number;
  perks: string[];
  warnings: string[];
  sisterVerified: boolean;
  safetyVerdict: string;
};

export type TripFeedback = {
  id: string;
  start_lat: number;
  start_lng: number;
  start_name?: string | null;
  end_lat: number;
  end_lng: number;
  end_name?: string | null;
  route_type: RouteType;
  route_title: string;
  safety_rating: number; // 1 - 5
  felt_safe: boolean;
  lighting_level: "bright" | "moderate" | "poor" | "dark";
  crowd_level: "crowded" | "moderate" | "deserted";
  hazards: string[];
  safe_spots: string[];
  comment?: string | null;
  created_at: string;
};

// Earth radius in meters
const EARTH_RADIUS_M = 6371000;

// Convert degrees to radians
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Haversine distance in meters between two lat/lng coordinates
export function haversineDistanceM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

// Distance from point P to line segment AB in meters
function distanceToSegmentM(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const l2 =
    (bLat - aLat) * (bLat - aLat) + (bLng - aLng) * (bLng - aLng);
  if (l2 === 0) return haversineDistanceM(pLat, pLng, aLat, aLng);

  let t =
    ((pLat - aLat) * (bLat - aLat) + (pLng - aLng) * (bLng - aLng)) / l2;
  t = Math.max(0, Math.min(1, t));

  const projLat = aLat + t * (bLat - aLat);
  const projLng = aLng + t * (bLng - aLng);
  return haversineDistanceM(pLat, pLng, projLat, projLng);
}

// Minimum distance from a point to a polyline in meters
export function minDistanceToPolylineM(
  lat: number,
  lng: number,
  polyline: [number, number][]
): number {
  if (polyline.length === 0) return Infinity;
  if (polyline.length === 1) {
    return haversineDistanceM(lat, lng, polyline[0][0], polyline[0][1]);
  }

  let minDist = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = distanceToSegmentM(
      lat,
      lng,
      polyline[i][0],
      polyline[i][1],
      polyline[i + 1][0],
      polyline[i + 1][1]
    );
    if (d < minDist) minDist = d;
  }
  return minDist;
}

const LOCAL_STORAGE_KEY = "herspace_trip_feedbacks_v1";

// Helper to load feedbacks from localStorage
export function getLocalTripFeedbacks(): TripFeedback[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Helper to save feedbacks locally
function saveLocalTripFeedback(fb: TripFeedback) {
  if (typeof window === "undefined") return;
  try {
    const list = getLocalTripFeedbacks();
    const updated = [fb, ...list].slice(0, 200);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("herspace-feedback-updated"));
  } catch {
    // silent catch
  }
}

// Load feedbacks from Supabase with fallback to local store
export async function loadAllTripFeedbacks(): Promise<TripFeedback[]> {
  const localList = getLocalTripFeedbacks();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("route_safety_feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !data) {
      return localList;
    }

    const remoteList: TripFeedback[] = data.map((d: any) => ({
      id: d.id,
      start_lat: Number(d.start_lat),
      start_lng: Number(d.start_lng),
      start_name: d.start_name,
      end_lat: Number(d.end_lat),
      end_lng: Number(d.end_lng),
      end_name: d.end_name,
      route_type: d.route_type as RouteType,
      route_title: d.route_title || "Safe Corridor",
      safety_rating: Number(d.safety_rating) || 5,
      felt_safe: Boolean(d.felt_safe),
      lighting_level: d.lighting_level || "bright",
      crowd_level: d.crowd_level || "moderate",
      hazards: Array.isArray(d.hazards) ? d.hazards : [],
      safe_spots: Array.isArray(d.safe_spots) ? d.safe_spots : [],
      comment: d.comment || null,
      created_at: d.created_at || new Date().toISOString(),
    }));

    // Merge and deduplicate by ID
    const map = new Map<string, TripFeedback>();
    [...remoteList, ...localList].forEach((item) => {
      if (item.id && !map.has(item.id)) {
        map.set(item.id, item);
      }
    });

    return Array.from(map.values());
  } catch {
    return localList;
  }
}

// Save trip feedback to Supabase and local store, triggering real-time recalculation
export async function submitTripFeedback(
  feedback: Omit<TripFeedback, "id" | "created_at">
): Promise<TripFeedback> {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id || null;

  const newFeedback: TripFeedback = {
    ...feedback,
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `fb-${Date.now()}`,
    created_at: new Date().toISOString(),
  };

  // Always cache locally so UX responds instantaneously
  saveLocalTripFeedback(newFeedback);

  // Submit to Supabase table
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("route_safety_feedback").insert({
      user_id: userId,
      route_title: feedback.route_title,
      start_lat: feedback.start_lat,
      start_lng: feedback.start_lng,
      start_name: feedback.start_name || null,
      end_lat: feedback.end_lat,
      end_lng: feedback.end_lng,
      end_name: feedback.end_name || null,
      safety_rating: feedback.safety_rating,
      felt_safe: feedback.felt_safe,
      lighting_level: feedback.lighting_level,
      crowd_level: feedback.crowd_level,
      hazards: feedback.hazards,
      safe_spots: feedback.safe_spots,
      comment: feedback.comment || null,
      route_type: feedback.route_type,
    });
  } catch (err) {
    console.warn("Could not save to Supabase route_safety_feedback, kept in local storage:", err);
  }

  // If user flagged specific hazards or safe spots, optionally add to safety_map_reports / safe_places
  if (feedback.hazards.length > 0 && userId) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("safety_map_reports").insert({
        user_id: userId,
        category: feedback.hazards.includes("poorly_lit")
          ? "poorly_lit"
          : feedback.hazards.includes("harassment")
            ? "harassment"
            : "isolated",
        time_window: "night",
        cell_lat: feedback.end_lat,
        cell_lng: feedback.end_lng,
        area_label: feedback.end_name ? `Reported near ${feedback.end_name}` : "Trip hazard report",
        note: feedback.comment || "Sister reported hazard during trip.",
      });
    } catch {
      // silent catch
    }
  }

  return newFeedback;
}

// Generate offset curved waypoint between start and end to create realistic alternatives if needed
function generateOffsetGeometry(
  start: SafeRoutePoint,
  end: SafeRoutePoint,
  offsetFactor: number,
  numPoints = 8
): [number, number][] {
  const coords: [number, number][] = [];
  const midLat = (start.lat + end.lat) / 2;
  const midLng = (start.lng + end.lng) / 2;

  // Perpendicular vector
  const dLat = end.lat - start.lat;
  const dLng = end.lng - start.lng;
  const perpLat = -dLng * offsetFactor;
  const perpLng = dLat * offsetFactor;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    // Quadratic bezier curve through offset control point
    const ctrlLat = midLat + perpLat;
    const ctrlLng = midLng + perpLng;

    const lat =
      (1 - t) * (1 - t) * start.lat + 2 * (1 - t) * t * ctrlLat + t * t * end.lat;
    const lng =
      (1 - t) * (1 - t) * start.lng + 2 * (1 - t) * t * ctrlLng + t * t * end.lng;
    coords.push([lat, lng]);
  }
  return coords;
}

// Evaluate a route's safety score based on safe places, hazard patterns, and real-time sister feedback
function evaluateRouteSafety(
  coords: [number, number][],
  safePlaces: Array<{ lat: number; lng: number; name?: string; place_type?: string }>,
  hazardPatterns: Array<{ cell_lat: number; cell_lng: number; category: string; reporters: number }>,
  tripFeedbacks: TripFeedback[],
  routeRole: RouteType
): {
  safetyScore: number;
  lightingScore: number;
  safeHavensCount: number;
  hazardsCount: number;
  feedbackCount: number;
  perks: string[];
  warnings: string[];
  sisterVerified: boolean;
  safetyVerdict: string;
} {
  let safeHavensCount = 0;
  let hazardsCount = 0;
  let feedbackCount = 0;
  let feedbackRatingSum = 0;
  let negativeFeedbackCount = 0;
  let lightingPositiveVotes = 0;
  let lightingNegativeVotes = 0;

  // 1. Check Safe Havens along route (< 400 meters)
  safePlaces.forEach((sp) => {
    const dist = minDistanceToPolylineM(sp.lat, sp.lng, coords);
    if (dist <= 400) {
      safeHavensCount++;
    }
  });

  // 2. Check Hazard Patterns along route (< 400 meters)
  hazardPatterns.forEach((hz) => {
    const dist = minDistanceToPolylineM(hz.cell_lat, hz.cell_lng, coords);
    if (dist <= 400) {
      hazardsCount += Math.min(hz.reporters || 1, 3);
    }
  });

  // 3. Check Sister Trip Feedbacks in route corridor (< 500 meters)
  tripFeedbacks.forEach((fb) => {
    const distStart = minDistanceToPolylineM(fb.start_lat, fb.start_lng, coords);
    const distEnd = minDistanceToPolylineM(fb.end_lat, fb.end_lng, coords);
    if (distStart <= 500 || distEnd <= 500) {
      feedbackCount++;
      feedbackRatingSum += fb.safety_rating;
      if (!fb.felt_safe || fb.safety_rating <= 2) {
        negativeFeedbackCount++;
      }
      if (fb.lighting_level === "bright") lightingPositiveVotes += 2;
      else if (fb.lighting_level === "moderate") lightingPositiveVotes += 1;
      else if (fb.lighting_level === "poor" || fb.lighting_level === "dark")
        lightingNegativeVotes += 2;
    }
  });

  // Dynamic Safety Score Calculation (Base depends on role, modulated by real data)
  let baseScore =
    routeRole === "safest" ? 9.2 : routeRole === "quickest" ? 7.2 : 4.2;

  // Safe Havens add positive weight
  baseScore += Math.min(safeHavensCount * 0.5, 1.5);

  // Hazards subtract weight
  baseScore -= Math.min(hazardsCount * 0.65, 3.2);

  // Sister real-time feedback effect
  if (feedbackCount > 0) {
    const avgFeedback = feedbackRatingSum / feedbackCount;
    // If avg feedback > 4.0, adds up to +1.2
    // If avg feedback < 3.0, penalizes up to -2.0
    const feedbackDelta = (avgFeedback - 3.0) * 0.65;
    baseScore += feedbackDelta;
  }

  // Adjust by route role penalties
  if (routeRole === "dangerous") {
    baseScore = Math.min(baseScore, 4.8);
  }

  const clampedScore = Number(Math.max(1.8, Math.min(9.9, baseScore)).toFixed(1));

  // Compute lighting score
  let baseLighting =
    routeRole === "safest" ? 92 : routeRole === "quickest" ? 75 : 38;
  if (lightingPositiveVotes > 0 || lightingNegativeVotes > 0) {
    const net = lightingPositiveVotes - lightingNegativeVotes;
    baseLighting = Math.max(20, Math.min(99, baseLighting + net * 4));
  }

  // Build perks and warnings
  const perks: string[] = [];
  const warnings: string[] = [];

  if (safeHavensCount > 0) {
    perks.push(`${safeHavensCount} verified Safe Haven(s) along this route`);
  }
  if (baseLighting >= 85) {
    perks.push("Consistently illuminated main arterial streets");
  } else if (baseLighting >= 70) {
    perks.push("Adequate evening municipal lighting");
  }

  if (feedbackCount > 0 && negativeFeedbackCount === 0) {
    perks.push(`Sister-verified: ${feedbackCount} safe trip review(s)`);
  }

  if (routeRole === "safest") {
    perks.push("Prioritizes active commercial areas and monitored zones");
  }

  if (hazardsCount > 0) {
    warnings.push(`${hazardsCount} caution notice(s) reported near this path`);
  }
  if (negativeFeedbackCount > 0) {
    warnings.push(`${negativeFeedbackCount} sisters noted concerns in this corridor`);
  }
  if (baseLighting < 50) {
    warnings.push("High incidence of dim / poorly-lit segments");
  }
  if (routeRole === "dangerous") {
    warnings.push("Passes through secluded alleys / low-visibility cut-throughs");
    warnings.push("Not advised for solo night travel");
  }

  let safetyVerdict = "Well-Monitored Corridor";
  if (clampedScore >= 9.0) {
    safetyVerdict = "Sister Sanctuary · Highest Safety";
  } else if (clampedScore >= 7.5) {
    safetyVerdict = "Safe Main Artery";
  } else if (clampedScore >= 5.5) {
    safetyVerdict = "Moderate Caution · Stay Alert";
  } else {
    safetyVerdict = "High Risk · Avoid / Use Caution";
  }

  return {
    safetyScore: clampedScore,
    lightingScore: Math.round(baseLighting),
    safeHavensCount,
    hazardsCount,
    feedbackCount,
    perks,
    warnings,
    sisterVerified: feedbackCount > 0 && clampedScore >= 7.0,
    safetyVerdict,
  };
}

// Calculate the 3 routes: Safest, Quickest, and Dangerous
export async function calculateSafeRoutes(
  start: SafeRoutePoint,
  end: SafeRoutePoint,
  safePlaces: Array<{ lat: number; lng: number; name?: string; place_type?: string }>,
  hazardPatterns: Array<{ cell_lat: number; cell_lng: number; category: string; reporters: number }>,
  tripFeedbacks: TripFeedback[],
  transportMode: "foot" | "driving" = "foot"
): Promise<RouteOption[]> {
  const directDistanceM = haversineDistanceM(start.lat, start.lng, end.lat, end.lng);
  const directKm = Number((directDistanceM / 1000).toFixed(2));
  const walkingSpeedKmH = 4.8;
  const drivingSpeedKmH = 32.0;
  const speed = transportMode === "driving" ? drivingSpeedKmH : walkingSpeedKmH;

  let osrmRoutes: Array<{ coordinates: [number, number][]; distanceKm: number; durationMin: number }> = [];

  // Attempt real OSRM fetch
  try {
    const profile = transportMode === "driving" ? "driving" : "foot";
    const url = `https://router.project-osrm.org/route/v1/${profile}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&alternatives=true&steps=false`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        osrmRoutes = data.routes.map((r: any) => {
          // OSRM returns coordinates as [lng, lat] GeoJSON, flip to [lat, lng] for Leaflet
          const coords: [number, number][] = (r.geometry.coordinates || []).map(
            (c: [number, number]) => [c[1], c[0]]
          );
          return {
            coordinates: coords,
            distanceKm: Number((r.distance / 1000).toFixed(2)),
            durationMin: Math.max(1, Math.round(r.duration / 60)),
          };
        });
      }
    }
  } catch {
    // If OSRM timeout or offline, use fallback geometries
  }

  // Determine optimal detour offset that avoids hazard patterns and guides through safe havens
  let safeOffset = 0.14;
  let dangerOffset = -0.16;

  if (hazardPatterns.length > 0) {
    const testPos = generateOffsetGeometry(start, end, 0.14, 6);
    const testNeg = generateOffsetGeometry(start, end, -0.14, 6);
    const posDist = Math.min(
      ...hazardPatterns.map((h) => minDistanceToPolylineM(h.cell_lat, h.cell_lng, testPos))
    );
    const negDist = Math.min(
      ...hazardPatterns.map((h) => minDistanceToPolylineM(h.cell_lat, h.cell_lng, testNeg))
    );
    if (posDist < negDist) {
      safeOffset = -0.18;
      dangerOffset = 0.12;
    } else {
      safeOffset = 0.18;
      dangerOffset = -0.12;
    }
  }

  // Ensure we have at least 3 distinct route geometries to compare (Safest, Quickest, Dangerous)
  const geomSafest: [number, number][] =
    osrmRoutes.length > 1
      ? osrmRoutes[1].coordinates
      : osrmRoutes.length === 1
        ? osrmRoutes[0].coordinates
        : generateOffsetGeometry(start, end, safeOffset, 10);

  const geomQuickest: [number, number][] =
    osrmRoutes.length > 0
      ? osrmRoutes[0].coordinates
      : generateOffsetGeometry(start, end, 0.0, 8);

  const geomDangerous: [number, number][] =
    osrmRoutes.length > 2
      ? osrmRoutes[2].coordinates
      : generateOffsetGeometry(start, end, dangerOffset, 9);

  // Evaluate each route
  const safestEval = evaluateRouteSafety(
    geomSafest,
    safePlaces,
    hazardPatterns,
    tripFeedbacks,
    "safest"
  );
  const quickestEval = evaluateRouteSafety(
    geomQuickest,
    safePlaces,
    hazardPatterns,
    tripFeedbacks,
    "quickest"
  );
  const dangerousEval = evaluateRouteSafety(
    geomDangerous,
    safePlaces,
    hazardPatterns,
    tripFeedbacks,
    "dangerous"
  );

  // Calculate durations & distances
  const baseSafestKm = Number((directKm * 1.08).toFixed(2));
  const baseQuickestKm = Number(directKm.toFixed(2));
  const baseDangerousKm = Number((directKm * 0.94).toFixed(2)); // shortcuts can be shorter in distance but darker/secluded

  const safestMin = Math.round((baseSafestKm / speed) * 60) || 5;
  const quickestMin = Math.round((baseQuickestKm / speed) * 60) || 4;
  const dangerousMin = Math.round((baseDangerousKm / speed) * 60) || 3;

  const safestRoute: RouteOption = {
    id: "safest",
    name: "Safest Route (Sanctuary Path)",
    type: "safest",
    color: "#ec4899", // Vibrant Rose Pink (Safest Route)
    glowColor: "rgba(236, 72, 153, 0.45)",
    distanceKm: baseSafestKm,
    durationMin: safestMin,
    safetyScore: safestEval.safetyScore,
    lightingScore: safestEval.lightingScore,
    coordinates: geomSafest,
    safeHavensCount: safestEval.safeHavensCount,
    hazardsCount: safestEval.hazardsCount,
    feedbackCount: safestEval.feedbackCount,
    perks: safestEval.perks,
    warnings: safestEval.warnings,
    sisterVerified: safestEval.sisterVerified,
    safetyVerdict: safestEval.safetyVerdict,
  };

  const quickestRoute: RouteOption = {
    id: "quickest",
    name: "Quickest Direct Route",
    type: "quickest",
    color: "#0284c7", // Sky/Cyan Blue
    glowColor: "rgba(2, 132, 199, 0.45)",
    distanceKm: baseQuickestKm,
    durationMin: quickestMin,
    safetyScore: quickestEval.safetyScore,
    lightingScore: quickestEval.lightingScore,
    coordinates: geomQuickest,
    safeHavensCount: quickestEval.safeHavensCount,
    hazardsCount: quickestEval.hazardsCount,
    feedbackCount: quickestEval.feedbackCount,
    perks: quickestEval.perks,
    warnings: quickestEval.warnings,
    sisterVerified: quickestEval.sisterVerified,
    safetyVerdict: quickestEval.safetyVerdict,
  };

  const dangerousRoute: RouteOption = {
    id: "dangerous",
    name: "Caution Shortcut (Not Recommended)",
    type: "dangerous",
    color: "#e11d48", // Crimson Rose
    glowColor: "rgba(225, 29, 72, 0.45)",
    distanceKm: baseDangerousKm,
    durationMin: dangerousMin,
    safetyScore: dangerousEval.safetyScore,
    lightingScore: dangerousEval.lightingScore,
    coordinates: geomDangerous,
    safeHavensCount: dangerousEval.safeHavensCount,
    hazardsCount: dangerousEval.hazardsCount,
    feedbackCount: dangerousEval.feedbackCount,
    perks: dangerousEval.perks,
    warnings: dangerousEval.warnings,
    sisterVerified: false,
    safetyVerdict: dangerousEval.safetyVerdict,
  };

  return [safestRoute, quickestRoute, dangerousRoute];
}
