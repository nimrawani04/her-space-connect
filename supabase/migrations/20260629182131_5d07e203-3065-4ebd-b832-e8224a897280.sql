
-- Extend cycle_entries with period-specific columns
ALTER TABLE public.cycle_entries
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS is_period_start boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS flow_intensity text,
  ADD COLUMN IF NOT EXISTS blood_color text,
  ADD COLUMN IF NOT EXISTS clotting text,
  ADD COLUMN IF NOT EXISTS pain_level integer CHECK (pain_level IS NULL OR (pain_level BETWEEN 0 AND 10)),
  ADD COLUMN IF NOT EXISTS period_symptoms jsonb;

-- Daily wellness logs (separate from cycle_entries to keep clean)
CREATE TABLE IF NOT EXISTS public.wellness_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  mood text[],
  energy_level integer CHECK (energy_level IS NULL OR (energy_level BETWEEN 1 AND 5)),
  sleep_hours numeric(4,1),
  sleep_quality integer CHECK (sleep_quality IS NULL OR (sleep_quality BETWEEN 1 AND 5)),
  water_glasses integer,
  exercise text[],
  nutrition jsonb,
  symptoms jsonb,
  custom_symptoms text[],
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wellness_logs TO authenticated;
GRANT ALL ON public.wellness_logs TO service_role;

ALTER TABLE public.wellness_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own wellness logs" ON public.wellness_logs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER touch_wellness_logs BEFORE UPDATE ON public.wellness_logs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Notification preferences
CREATE TABLE IF NOT EXISTS public.notification_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_period boolean DEFAULT true,
  notify_ovulation boolean DEFAULT true,
  notify_hydration boolean DEFAULT false,
  notify_sleep boolean DEFAULT false,
  notify_logging boolean DEFAULT true,
  notify_medication boolean DEFAULT false,
  notify_doctor boolean DEFAULT false,
  period_lead_days integer DEFAULT 2,
  ai_analysis_enabled boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_prefs TO authenticated;
GRANT ALL ON public.notification_prefs TO service_role;

ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own notification prefs" ON public.notification_prefs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER touch_notification_prefs BEFORE UPDATE ON public.notification_prefs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
