CREATE TABLE IF NOT EXISTS public.journey_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text,
  is_anonymous boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journey_messages TO authenticated;
GRANT ALL ON public.journey_messages TO service_role;
ALTER TABLE public.journey_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'jm_messages_select' AND tablename = 'journey_messages') THEN
    CREATE POLICY "jm_messages_select" ON public.journey_messages FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'jm_messages_insert' AND tablename = 'journey_messages') THEN
    CREATE POLICY "jm_messages_insert" ON public.journey_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'jm_messages_update' AND tablename = 'journey_messages') THEN
    CREATE POLICY "jm_messages_update" ON public.journey_messages FOR UPDATE TO authenticated USING (auth.uid() = author_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'jm_messages_delete' AND tablename = 'journey_messages') THEN
    CREATE POLICY "jm_messages_delete" ON public.journey_messages FOR DELETE TO authenticated USING (auth.uid() = author_id);
  END IF;
END $$;

ALTER TABLE public.journey_messages
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS attachment_size bigint;

ALTER TABLE public.journey_messages ALTER COLUMN body DROP NOT NULL;

CREATE POLICY "Circle members can upload files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'circle-files'
  AND owner = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.journey_members m
    WHERE m.user_id = auth.uid()
      AND m.journey_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Circle members can read circle files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'circle-files'
  AND EXISTS (
    SELECT 1 FROM public.journey_members m
    WHERE m.user_id = auth.uid()
      AND m.journey_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Uploaders can delete their circle files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'circle-files' AND owner = auth.uid());