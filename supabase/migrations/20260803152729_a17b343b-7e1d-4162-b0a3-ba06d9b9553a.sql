-- 1. pregnancy_profiles
CREATE TABLE public.pregnancy_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'planning',
  lmp_date date,
  conception_date date,
  due_date date,
  test_result text,
  test_date date,
  next_appointment date,
  birth_plan text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pregnancy_profiles TO authenticated;
GRANT ALL ON public.pregnancy_profiles TO service_role;
ALTER TABLE public.pregnancy_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pregnancy profile" ON public.pregnancy_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. fertility_logs
CREATE TABLE public.fertility_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  bbt_celsius numeric(4,2),
  cervical_mucus text,
  ovulation_test text,
  intercourse boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fertility_logs TO authenticated;
GRANT ALL ON public.fertility_logs TO service_role;
ALTER TABLE public.fertility_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fertility logs" ON public.fertility_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. preconception_checklist
CREATE TABLE public.preconception_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preconception_checklist TO authenticated;
GRANT ALL ON public.preconception_checklist TO service_role;
ALTER TABLE public.preconception_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checklist" ON public.preconception_checklist FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. pregnancy_health_logs
CREATE TABLE public.pregnancy_health_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  weight_kg numeric(5,2),
  bp_systolic int,
  bp_diastolic int,
  blood_sugar numeric(5,1),
  water_glasses int,
  sleep_hours numeric(3,1),
  mood text,
  exercise text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pregnancy_health_logs TO authenticated;
GRANT ALL ON public.pregnancy_health_logs TO service_role;
ALTER TABLE public.pregnancy_health_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pregnancy health logs" ON public.pregnancy_health_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. kick_counts
CREATE TABLE public.kick_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  kicks int NOT NULL DEFAULT 0,
  week int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kick_counts TO authenticated;
GRANT ALL ON public.kick_counts TO service_role;
ALTER TABLE public.kick_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own kick counts" ON public.kick_counts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. contractions
CREATE TABLE public.contractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  duration_seconds int NOT NULL,
  intensity int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractions TO authenticated;
GRANT ALL ON public.contractions TO service_role;
ALTER TABLE public.contractions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own contractions" ON public.contractions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. pregnancy_appointments
CREATE TABLE public.pregnancy_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  appt_date date NOT NULL,
  appt_time text,
  kind text NOT NULL DEFAULT 'checkup',
  notes text,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pregnancy_appointments TO authenticated;
GRANT ALL ON public.pregnancy_appointments TO service_role;
ALTER TABLE public.pregnancy_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own appointments" ON public.pregnancy_appointments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. pregnancy_records
CREATE TABLE public.pregnancy_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_type text NOT NULL DEFAULT 'lab',
  title text NOT NULL,
  record_date date NOT NULL,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pregnancy_records TO authenticated;
GRANT ALL ON public.pregnancy_records TO service_role;
ALTER TABLE public.pregnancy_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pregnancy records" ON public.pregnancy_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER t_pregnancy_profiles_updated BEFORE UPDATE ON public.pregnancy_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_fertility_logs_updated BEFORE UPDATE ON public.fertility_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_preconception_updated BEFORE UPDATE ON public.preconception_checklist FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_preg_health_updated BEFORE UPDATE ON public.pregnancy_health_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_kicks_updated BEFORE UPDATE ON public.kick_counts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_contractions_updated BEFORE UPDATE ON public.contractions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_appointments_updated BEFORE UPDATE ON public.pregnancy_appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_preg_records_updated BEFORE UPDATE ON public.pregnancy_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();