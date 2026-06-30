// Pure helpers for menstrual cycle statistics.
// All inputs are sorted-by-date arrays; outputs are plain numbers/objects for UI.

export type PeriodEntry = {
  entry_date: string;
  end_date?: string | null;
  is_period_start?: boolean | null;
  flow_intensity?: string | null;
  flow?: string | null;
  pain_level?: number | null;
  cramp_level?: number | null;
};

const FLOW_RANK: Record<string, number> = {
  spotting: 1, light: 2, medium: 3, heavy: 4, very_heavy: 5,
};

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

/** Returns descending-by-date list of period START dates (deduped). */
export function periodStarts(rows: PeriodEntry[]): string[] {
  return rows
    .filter((r) => r.is_period_start || (r.flow_intensity && r.flow_intensity !== "none") || (r.flow && r.flow !== "none"))
    .map((r) => r.entry_date)
    .filter((d, i, arr) => arr.indexOf(d) === i)
    .sort((a, b) => b.localeCompare(a));
}

export function cycleLengths(starts: string[]): number[] {
  const sorted = [...starts].sort();
  const out: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const d = daysBetween(sorted[i - 1], sorted[i]);
    if (d > 10 && d < 90) out.push(d);
  }
  return out;
}

export function periodDurations(rows: PeriodEntry[]): number[] {
  return rows
    .filter((r) => r.end_date && r.entry_date)
    .map((r) => daysBetween(r.entry_date, r.end_date!) + 1)
    .filter((n) => n > 0 && n < 15);
}

export function averageFlow(rows: PeriodEntry[]): { rank: number; label: string } | null {
  const ranks = rows
    .map((r) => (r.flow_intensity ? FLOW_RANK[r.flow_intensity] : undefined))
    .filter((n): n is number => typeof n === "number");
  if (!ranks.length) return null;
  const avg = ranks.reduce((a, b) => a + b, 0) / ranks.length;
  const label = avg < 1.5 ? "spotting" : avg < 2.5 ? "light" : avg < 3.5 ? "medium" : avg < 4.5 ? "heavy" : "very heavy";
  return { rank: avg, label };
}

export function regularity(lengths: number[]): { variance: number; label: "Regular" | "Somewhat irregular" | "Irregular" } | null {
  if (lengths.length < 2) return null;
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = Math.sqrt(lengths.map((l) => (l - mean) ** 2).reduce((a, b) => a + b, 0) / lengths.length);
  const label = variance < 3 ? "Regular" : variance < 7 ? "Somewhat irregular" : "Irregular";
  return { variance, label };
}

export function summarizeCycles(rows: PeriodEntry[]) {
  const starts = periodStarts(rows);
  const lengths = cycleLengths(starts);
  const durations = periodDurations(rows);
  const reg = regularity(lengths);
  const crampVals = rows
    .map((r) => (typeof r.cramp_level === "number" ? r.cramp_level : null))
    .filter((n): n is number => n !== null && n > 0);
  const avgCramp = crampVals.length
    ? +(crampVals.reduce((a, b) => a + b, 0) / crampVals.length).toFixed(1)
    : null;
  const peakCramp = crampVals.length ? Math.max(...crampVals) : null;
  const severeCrampCycles = rows.filter(
    (r) => (r.is_period_start || r.flow_intensity) && typeof r.cramp_level === "number" && r.cramp_level >= 7,
  ).length;
  return {
    cycleCount: starts.length,
    avgCycle: lengths.length ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : null,
    avgPeriod: durations.length ? +(durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1) : null,
    flow: averageFlow(rows),
    regularity: reg,
    longest: lengths.length ? Math.max(...lengths) : null,
    shortest: lengths.length ? Math.min(...lengths) : null,
    lastStart: starts[0] ?? null,
    daysSinceLast: starts[0] ? daysBetween(starts[0], new Date().toISOString().slice(0, 10)) : null,
    avgCramp,
    peakCramp,
    severeCrampCycles,
  };
}

/** Estimate next period using last start + average cycle. Returns date range [low, high]. */
export function predictNextWindow(lastStart: string | null, avgCycle: number | null, variance: number) {
  if (!lastStart || !avgCycle) return null;
  const base = new Date(lastStart);
  const pad = Math.max(1, Math.round(variance || 2));
  const mid = new Date(base.getTime() + avgCycle * 86400000);
  const low = new Date(mid.getTime() - pad * 86400000);
  const high = new Date(mid.getTime() + pad * 86400000);
  return { low: low.toISOString().slice(0, 10), high: high.toISOString().slice(0, 10), mid: mid.toISOString().slice(0, 10) };
}

export const FLOW_OPTIONS = ["spotting", "light", "medium", "heavy", "very_heavy"] as const;
export const BLOOD_COLORS = ["bright red", "dark red", "brown", "pink", "black"] as const;
export const CLOTTING_OPTIONS = ["none", "small", "moderate", "heavy"] as const;
export const PERIOD_SYMPTOMS = [
  "cramps", "back_pain", "headache", "nausea", "breast_tenderness", "bloating", "digestive_issues",
] as const;
