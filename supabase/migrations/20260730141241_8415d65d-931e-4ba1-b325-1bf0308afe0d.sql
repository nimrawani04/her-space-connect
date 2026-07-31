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