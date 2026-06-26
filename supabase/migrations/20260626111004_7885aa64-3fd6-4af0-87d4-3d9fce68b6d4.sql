CREATE TABLE public.travel_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  city text NOT NULL,
  country text NOT NULL,
  need text NOT NULL,
  contact text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_requests TO authenticated;
GRANT ALL ON public.travel_requests TO service_role;

ALTER TABLE public.travel_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read travel requests"
  ON public.travel_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert own travel requests"
  ON public.travel_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own travel requests"
  ON public.travel_requests FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own travel requests"
  ON public.travel_requests FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX travel_requests_created_at_idx ON public.travel_requests (created_at DESC);