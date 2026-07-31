CREATE OR REPLACE FUNCTION public.is_journey_member(_journey_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.journey_members m WHERE m.journey_id = _journey_id AND m.user_id = _user_id)
$$;

CREATE TABLE public.message_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.journey_messages(id) ON DELETE CASCADE,
  journey_id uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, viewer_id)
);

GRANT SELECT, INSERT ON public.message_views TO authenticated;
GRANT ALL ON public.message_views TO service_role;

ALTER TABLE public.message_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can see views in their circles"
ON public.message_views FOR SELECT TO authenticated
USING (public.is_journey_member(journey_id, auth.uid()));

CREATE POLICY "Members can record their own view"
ON public.message_views FOR INSERT TO authenticated
WITH CHECK (viewer_id = auth.uid() AND public.is_journey_member(journey_id, auth.uid()));

CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.journey_messages(id) ON DELETE CASCADE,
  journey_id uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can see reactions in their circles"
ON public.message_reactions FOR SELECT TO authenticated
USING (public.is_journey_member(journey_id, auth.uid()));

CREATE POLICY "Members can add their own reactions"
ON public.message_reactions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_journey_member(journey_id, auth.uid()));

CREATE POLICY "Members can remove their own reactions"
ON public.message_reactions FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE INDEX idx_message_views_message ON public.message_views(message_id);
CREATE INDEX idx_message_reactions_message ON public.message_reactions(message_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_views;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;