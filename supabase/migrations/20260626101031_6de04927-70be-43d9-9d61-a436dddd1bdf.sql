ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme_mode text,
  ADD COLUMN IF NOT EXISTS accent_color text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_theme_mode_check CHECK (theme_mode IS NULL OR theme_mode IN ('light','dark','system')),
  ADD CONSTRAINT profiles_accent_color_check CHECK (accent_color IS NULL OR accent_color ~* '^#[a-f0-9]{6}$');