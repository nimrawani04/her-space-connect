import { describe, it, expect } from "vitest";
import {
  haversineDistanceM,
  minDistanceToPolylineM,
  calculateSafeRoutes,
} from "./safe-routing";

describe("Safe Routing Engine", () => {
  it("computes accurate haversine distance between two points", () => {
    // Tokyo Shibuya to Yoyogi Park is ~800-1000m
    const d = haversineDistanceM(35.658, 139.7016, 35.664, 139.698);
    expect(d).toBeGreaterThan(600);
    expect(d).toBeLessThan(1200);
  });

  it("calculates minimum distance from a point to a polyline", () => {
    const polyline: [number, number][] = [
      [35.658, 139.7016],
      [35.660, 139.7000],
      [35.664, 139.6980],
    ];
    // Exact point on the line
    const distZero = minDistanceToPolylineM(35.660, 139.7000, polyline);
    expect(distZero).toBeLessThan(5);

    // Nearby point ~100m away
    const distNear = minDistanceToPolylineM(35.660, 139.7010, polyline);
    expect(distNear).toBeGreaterThan(50);
    expect(distNear).toBeLessThan(200);
  });

  it(
    "calculates 3 distinct route options: Safest, Quickest, and Caution/Dangerous",
    async () => {
    const start = { lat: 35.658, lng: 139.7016, label: "Start Hub" };
    const end = { lat: 35.664, lng: 139.6980, label: "Destination" };
    const safePlaces = [
      { lat: 35.661, lng: 139.7005, name: "Safe Haven Cafe", place_type: "safe_haven" },
    ];
    const hazardPatterns = [
      { cell_lat: 35.659, cell_lng: 139.6990, category: "poorly_lit", reporters: 4 },
    ];

    const routes = await calculateSafeRoutes(start, end, safePlaces, hazardPatterns, []);

    expect(routes).toHaveLength(3);
    const safest = routes.find((r) => r.type === "safest");
    const quickest = routes.find((r) => r.type === "quickest");
    const dangerous = routes.find((r) => r.type === "dangerous");

    expect(safest).toBeDefined();
    expect(quickest).toBeDefined();
    expect(dangerous).toBeDefined();

    // Safest route should be pink
    expect(safest!.color).toBe("#ec4899");

    // Safest route should have high safety score
    expect(safest!.safetyScore).toBeGreaterThan(7.0);
    // Dangerous route should have lower safety score
    expect(dangerous!.safetyScore).toBeLessThan(safest!.safetyScore);
  }, 15000);
});
