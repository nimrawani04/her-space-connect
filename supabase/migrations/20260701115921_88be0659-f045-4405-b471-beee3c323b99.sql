ALTER TABLE public.travel_requests
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS longitude;