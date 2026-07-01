
DROP POLICY IF EXISTS "travel_requests verified read" ON public.travel_requests;
DROP POLICY IF EXISTS "travel_requests verified insert" ON public.travel_requests;
CREATE POLICY "travel_requests read"
  ON public.travel_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "travel_requests insert"
  ON public.travel_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "verified sisters can request" ON public.travel_connections;
CREATE POLICY "sisters can request"
  ON public.travel_connections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user AND from_user <> to_user);

DROP FUNCTION IF EXISTS public.is_verified(uuid);

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS verification_status,
  DROP COLUMN IF EXISTS verification_selfie_path,
  DROP COLUMN IF EXISTS verified_at;
