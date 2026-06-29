CREATE TABLE public.prediction_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  predicted_at timestamptz NOT NULL DEFAULT now(),
  next_period_low date,
  next_period_high date,
  next_period_end date,
  fertile_window_low date,
  fertile_window_high date,
  ovulation_day date,
  pms_start date,
  confidence numeric,
  is_late boolean,
  summary text,
  cycles_used integer NOT NULL DEFAULT 0,
  data_start date,
  data_end date,
  recent_starts jsonb NOT NULL DEFAULT '[]'::jsonb,
  avg_cycle_length numeric,
  avg_period_length numeric,
  regularity_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prediction_runs TO authenticated;
GRANT ALL ON public.prediction_runs TO service_role;

ALTER TABLE public.prediction_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own prediction runs"
  ON public.prediction_runs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX prediction_runs_user_predicted_at_idx
  ON public.prediction_runs (user_id, predicted_at DESC);