import { describe, it, expect } from "vitest";
import {
  periodStarts,
  cycleLengths,
  periodDurations,
  averageFlow,
  regularity,
  summarizeCycles,
  predictNextWindow,
  type PeriodEntry,
} from "./cycle-stats";

const rows: PeriodEntry[] = [
  { entry_date: "2026-01-01", end_date: "2026-01-05", is_period_start: true, flow_intensity: "medium", cramp_level: 4 },
  { entry_date: "2026-01-29", end_date: "2026-02-02", is_period_start: true, flow_intensity: "heavy", cramp_level: 8 },
  { entry_date: "2026-02-28", end_date: "2026-03-03", is_period_start: true, flow_intensity: "light", cramp_level: 2 },
  { entry_date: "2026-03-30", end_date: "2026-04-03", is_period_start: true, flow_intensity: "medium", cramp_level: 5 },
];

describe("periodStarts", () => {
  it("returns unique start dates sorted descending", () => {
    const s = periodStarts(rows);
    expect(s).toEqual(["2026-03-30", "2026-02-28", "2026-01-29", "2026-01-01"]);
  });

  it("ignores rows without a flow or start flag", () => {
    const s = periodStarts([
      { entry_date: "2026-05-01", flow_intensity: "none" },
      { entry_date: "2026-05-02", is_period_start: true },
    ]);
    expect(s).toEqual(["2026-05-02"]);
  });
});

describe("cycleLengths", () => {
  it("computes gaps between consecutive starts, filtering unrealistic values", () => {
    const lengths = cycleLengths(periodStarts(rows));
    expect(lengths).toEqual([28, 30, 30]);
  });

  it("returns empty when fewer than two starts", () => {
    expect(cycleLengths(["2026-01-01"])).toEqual([]);
  });

  it("drops gaps <= 10 or >= 90 days", () => {
    expect(cycleLengths(["2026-01-01", "2026-01-05", "2026-06-01"])).toEqual([]);
  });
});

describe("periodDurations", () => {
  it("computes inclusive period durations", () => {
    expect(periodDurations(rows)).toEqual([5, 5, 4, 5]);
  });
});

describe("averageFlow", () => {
  it("returns null when no flow data present", () => {
    expect(averageFlow([{ entry_date: "2026-01-01" }])).toBeNull();
  });

  it("maps average rank to a label", () => {
    const f = averageFlow(rows);
    expect(f?.label).toBe("medium");
    expect(f?.rank).toBeGreaterThan(2.5);
  });
});

describe("regularity", () => {
  it("labels tight cycles as Regular", () => {
    expect(regularity([28, 29, 28])?.label).toBe("Regular");
  });

  it("labels widely varying cycles as Irregular", () => {
    expect(regularity([21, 35, 22, 40])?.label).toBe("Irregular");
  });

  it("returns null with < 2 samples", () => {
    expect(regularity([28])).toBeNull();
  });
});

describe("summarizeCycles", () => {
  it("aggregates counts, averages, and cramp stats", () => {
    const s = summarizeCycles(rows);
    expect(s.cycleCount).toBe(4);
    expect(s.avgCycle).toBe(29);
    expect(s.avgPeriod).toBe(4.8);
    expect(s.peakCramp).toBe(8);
    expect(s.severeCrampCycles).toBe(1);
    expect(s.lastStart).toBe("2026-03-30");
  });
});

describe("predictNextWindow", () => {
  it("returns null when inputs missing", () => {
    expect(predictNextWindow(null, 28, 2)).toBeNull();
    expect(predictNextWindow("2026-01-01", null, 2)).toBeNull();
  });

  it("centers the window on lastStart + avgCycle with variance padding", () => {
    const w = predictNextWindow("2026-01-01", 28, 2);
    expect(w).toEqual({ low: "2026-01-27", mid: "2026-01-29", high: "2026-01-31" });
  });

  it("falls back to a 2-day pad when variance is zero", () => {
    // variance is coerced with `|| 2`, so 0 becomes 2.
    const w = predictNextWindow("2026-01-01", 28, 0);
    expect(w?.low).toBe("2026-01-27");
    expect(w?.high).toBe("2026-01-31");
  });
});