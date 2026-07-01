
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','pending','verified','rejected')),
  ADD COLUMN IF NOT EXISTS verification_selfie_path text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE OR REPLACE FUNCTION public.is_verified(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND verification_status = 'verified')
$$;

-- Tighten travel_requests SELECT: only verified members can browse
DROP POLICY IF EXISTS "travel_requests read" ON public.travel_requests;
DROP POLICY IF EXISTS "travel_requests insert" ON public.travel_requests;
CREATE POLICY "travel_requests verified read"
  ON public.travel_requests FOR SELECT TO authenticated
  USING (public.is_verified(auth.uid()) OR auth.uid() = user_id);
CREATE POLICY "travel_requests verified insert"
  ON public.travel_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_verified(auth.uid()));

-- Connection requests between sisters
CREATE TABLE IF NOT EXISTS public.travel_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.travel_requests(id) ON DELETE CASCADE,
  from_user uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, from_user)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_connections TO authenticated;
GRANT ALL ON public.travel_connections TO service_role;
ALTER TABLE public.travel_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "connections visible to parties"
  ON public.travel_connections FOR SELECT TO authenticated
  USING (auth.uid() = from_user OR auth.uid() = to_user);
CREATE POLICY "verified sisters can request"
  ON public.travel_connections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user AND public.is_verified(auth.uid()) AND from_user <> to_user);
CREATE POLICY "recipient or sender can update"
  ON public.travel_connections FOR UPDATE TO authenticated
  USING (auth.uid() = to_user OR auth.uid() = from_user)
  WITH CHECK (auth.uid() = to_user OR auth.uid() = from_user);
CREATE POLICY "sender can withdraw"
  ON public.travel_connections FOR DELETE TO authenticated
  USING (auth.uid() = from_user);

CREATE INDEX IF NOT EXISTS travel_connections_request_idx ON public.travel_connections(request_id);
CREATE INDEX IF NOT EXISTS travel_connections_to_user_idx ON public.travel_connections(to_user);
CREATE TRIGGER travel_connections_touch BEFORE UPDATE ON public.travel_connections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
