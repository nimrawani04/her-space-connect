ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS background_style text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_background_style_check
  CHECK (background_style IS NULL OR background_style IN ('plain','warm','sage','dusk','grain','gradient'));