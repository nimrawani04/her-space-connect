## Period, Cycle & Hormone Intelligence Tracker

Extending the existing Health Hub (`src/routes/_authenticated/health.tsx`) into a full menstrual intelligence system. The current page already has cycle entries, phase detection, hormone chart, symptom severity, correlations, trends, and next-cycle forecast. This plan adds the missing layers: rich period logging, daily wellness, AI insights, dashboards, reports, and notifications — without breaking what's there.

### 1. Data model (one migration)

Extend `cycle_entries` and add new tables:

- `cycle_entries` — add: `end_date date`, `flow_intensity text` (spotting/light/medium/heavy/very_heavy), `blood_color text`, `clotting text`, `pain_level int (1-10)`, `period_symptoms jsonb` (cramps/back_pain/headache/nausea/breast_tenderness/bloating/digestive — with severities), `is_period_start bool` (already implicit, make explicit).
- `wellness_logs` — `user_id`, `log_date` (unique per user/day), `mood text[]`, `energy_level int (1-5)`, `sleep_hours numeric`, `sleep_quality int (1-5)`, `water_glasses int`, `exercise text[]`, `nutrition jsonb`, `symptoms jsonb` (symptom→severity), `custom_symptoms text[]`, `notes text`.
- `notification_prefs` — per-user toggles + lead times for period, ovulation, hydration, sleep, logging, doctor follow-up.
- `cycle_reports` — generated PDF metadata (optional cache).

All with RLS scoped to `auth.uid()`, grants to `authenticated` + `service_role`, `updated_at` triggers.

### 2. Period logging (Cycle Tracker upgrade)

Rework the existing tracker form into a 3-step sheet:
1. **Dates & flow** — start/end date pickers, flow intensity chips, blood color, clotting.
2. **Pain & period symptoms** — pain slider 1-10, severity chips for cramps/back/headache/nausea/breast/bloating/digestive.
3. **Notes** — free text.

Auto-derived stats card (computed client-side from last 12 cycles): avg cycle length, avg period duration, avg flow, regularity %, longest/shortest, missed/irregular flags.

### 3. AI cycle prediction

New server fn `predictCycle` in `src/lib/ai.functions.ts` using Lovable AI (`google/gemini-3-flash-preview`) — sends anonymized cycle history JSON, returns:
- next period window (date range) + confidence %
- fertile window, ovulation day, PMS phase, expected end date
- late-period flag + explanation

Cached per-user per-day. Surfaced on a new **Predictions** card with the example phrasing the user requested.

### 4. Hormone phase timeline (educational)

Upgrade the existing `HormoneChart` to a **Phase Timeline** component:
- Horizontal timeline showing the 4 phases with day ranges.
- Curves for Estrogen, Progesterone, LH, FSH (already present — relabel).
- Per-phase "How this may affect you" panel: mood / energy / appetite / sleep / focus / exercise / skin.
- Clear disclaimer banner: "Estimated patterns based on typical cycles, not lab measurements."

### 5. Daily wellness tracking

New route `src/routes/_authenticated/wellness-daily.tsx` (separate from the journaling page) OR a **Daily** tab inside Health Hub. Chosen: **tab inside Health Hub** to keep one source of truth.

- Today's log form with chip selectors for mood/energy/exercise/nutrition/symptoms + sliders for sleep/water.
- Custom symptom add.
- Streak indicator + last 7 days mini-grid.

### 6. AI insights & pattern detection

New server fn `generateHealthInsights` — takes last 90 days of cycles + wellness logs, returns 5-8 plain-language insights matching the user's examples. Rendered as an **Insights** card with refresh button and "last analyzed" timestamp.

### 7. Interactive dashboards

New **Dashboard** tab with:
- Monthly calendar (period days, ovulation, logged wellness dots).
- Trend mini-charts (SVG, same style as existing): cycle length, flow, mood, energy, symptom frequency, sleep, water, exercise consistency.
- Range filter: week / month / 6 months / year.

### 8. Health reports (PDF export)

Extend the existing "doctor-ready report" to a full PDF using `jspdf` (already in stack pattern) covering: cycle history table, averages, symptom trends, mood/lifestyle summary, AI observations, suggested doctor questions. Download button on Dashboard tab.

### 9. Smart notifications

- `notification_prefs` table + Settings card on Health Hub.
- Browser `Notification` API for in-session reminders (period upcoming, ovulation, hydration, sleep, logging, medication, doctor follow-up).
- Scheduling via in-app daily check on app load (no background worker needed for MVP).

### 10. Privacy & security

- Settings card: **Export my data** (JSON download of all cycle + wellness logs), **Delete all health data** (confirms, deletes from cycle_entries + wellness_logs + journal_entries), **Disable AI analysis** toggle (gates server-fn calls).
- All tables already RLS-scoped to `auth.uid()`. Add note in UI.

### File map

```text
supabase migration            (1 file)
src/lib/ai.functions.ts       (+predictCycle, +generateHealthInsights)
src/lib/cycle-stats.ts        (pure stats helpers)
src/lib/pdf-report.ts         (jspdf builder)
src/routes/_authenticated/health.tsx
  ├─ Tab: Log (upgraded tracker)
  ├─ Tab: Cycle & Hormones (existing + phase timeline + predictions)
  ├─ Tab: Daily Wellness (new)
  ├─ Tab: Insights (new — AI insights + trends)
  ├─ Tab: Dashboard (new — calendar + reports + export)
  └─ Tab: Settings (new — notifications + privacy)
src/components/health/*       (split large components out of health.tsx)
```

### Scope notes

- Builds on existing tables/components — does not replace cycle phase detection, hormone chart, symptom severity, correlations, trends, or forecast already shipped.
- Uses Lovable AI Gateway (no new keys).
- Mobile-responsive (existing patterns).
- No third-party push notifications — browser `Notification` API only for MVP.

Ready to build — shall I proceed?
