ALTER TABLE public.travel_connections
  ADD COLUMN IF NOT EXISTS contact_type text,
  ADD COLUMN IF NOT EXISTS contact_handle text;

ALTER TABLE public.travel_connections
  DROP CONSTRAINT IF EXISTS travel_connections_contact_type_check;

ALTER TABLE public.travel_connections
  ADD CONSTRAINT travel_connections_contact_type_check
  CHECK (contact_type IS NULL OR contact_type IN ('whatsapp','instagram','phone','email','telegram','other'));