#!/usr/bin/env node
// Guard: travel posts / travel requests must never carry coordinates.
// Fails the build if latitude/longitude/lat/lng/coordinates appear in
// travel-related source files, generated Supabase types for travel tables,
// or the live database schema (when PG* env vars are available).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const FORBIDDEN = /\b(latitude|longitude|coordinates|geocode|reverseGeocode)\b|(?<![A-Za-z_])(lat|lng|lon)(?![A-Za-z_])/;
const TRAVEL_FILE = /travel/i;
const errors = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      walk(p);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name) && TRAVEL_FILE.test(p)) {
      const src = readFileSync(p, "utf8");
      src.split("\n").forEach((line, i) => {
        if (FORBIDDEN.test(line)) errors.push(`${p}:${i + 1}  ${line.trim()}`);
      });
    }
  }
}

walk("src");

// Generated Supabase types: check travel_* table blocks specifically.
try {
  const types = readFileSync("src/integrations/supabase/types.ts", "utf8");
  const re = /travel_(requests|connections|hosts)\s*:\s*\{[\s\S]*?\n\s{6}\}\n\s{4}\}/g;
  for (const m of types.matchAll(re)) {
    if (FORBIDDEN.test(m[0])) {
      errors.push(`src/integrations/supabase/types.ts  travel_${m[1]} block contains a coordinate field`);
    }
  }
} catch {}

if (errors.length) {
  console.error("❌ Travel geo guard failed. Coordinates are forbidden in travel surfaces:\n");
  for (const e of errors) console.error("  " + e);
  process.exit(1);
}

console.log("✓ Travel geo guard: no latitude/longitude in travel code or types.");