ALTER TABLE public.journey_messages
  ADD COLUMN IF NOT EXISTS scan_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS scan_detail TEXT,
  ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'journey_messages_scan_status_check') THEN
    ALTER TABLE public.journey_messages
      ADD CONSTRAINT journey_messages_scan_status_check
      CHECK (scan_status IN ('pending','clean','infected','error'));
  END IF;
END $$;

UPDATE public.journey_messages SET scan_status = 'clean' WHERE attachment_path IS NULL;

CREATE TABLE public.quarantined_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id UUID REFERENCES public.journeys(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.quarantined_files TO authenticated;
GRANT ALL ON public.quarantined_files TO service_role;

ALTER TABLE public.quarantined_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Uploaders can view their own quarantined files"
  ON public.quarantined_files FOR SELECT TO authenticated
  USING (auth.uid() = uploader_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_quarantined_files_updated_at
  BEFORE UPDATE ON public.quarantined_files
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();