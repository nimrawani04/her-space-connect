ALTER TABLE public.pregnancy_health_logs
ADD COLUMN IF NOT EXISTS symptoms jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.pregnancy_health_logs
ADD CONSTRAINT pregnancy_health_logs_symptoms_object
CHECK (jsonb_typeof(symptoms) = 'object');