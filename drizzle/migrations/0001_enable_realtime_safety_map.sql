DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'safety_map_reports') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_map_reports;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'safe_places') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.safe_places;
  END IF;
END $$;