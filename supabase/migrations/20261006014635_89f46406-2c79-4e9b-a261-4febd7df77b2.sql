CREATE TABLE public.safety_map_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('harassment','stalking','poorly_lit','isolated','unsafe_transport','suspicious_recurring')),
  time_window text NOT NULL DEFAULT 'any' CHECK (time_window IN ('morning','afternoon','evening','night','any')),
  cell_lat numeric(8,3) NOT NULL,
  cell_lng numeric(8,3) NOT NULL,
  area_label text CHECK (char_length(area_label) <= 120),
  note text CHECK (char_length(note) <= 280),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.safety_map_reports TO authenticated;
GRANT ALL ON public.safety_map_reports TO service_role;
ALTER TABLE public.safety_map_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reports read" ON public.safety_map_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own reports insert" ON public.safety_map_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own reports delete" ON public.safety_map_reports FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Snap every location to a ~500m grid cell so no exact point is ever stored
CREATE OR REPLACE FUNCTION public.snap_safety_cell() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.cell_lat := round(NEW.cell_lat / 0.005) * 0.005;
  NEW.cell_lng := round(NEW.cell_lng / 0.005) * 0.005;
  RETURN NEW;
END $$;
CREATE TRIGGER snap_safety_cell BEFORE INSERT OR UPDATE ON public.safety_map_reports FOR EACH ROW EXECUTE FUNCTION public.snap_safety_cell();

-- Only aggregated patterns with >= 3 distinct reporters are visible
CREATE OR REPLACE FUNCTION public.get_safety_patterns(min_lat numeric, max_lat numeric, min_lng numeric, max_lng numeric)
RETURNS TABLE(cell_lat numeric, cell_lng numeric, category text, time_window text, reporters bigint, last_reported timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.cell_lat, r.cell_lng, r.category,
         mode() WITHIN GROUP (ORDER BY r.time_window) AS time_window,
         count(DISTINCT r.user_id) AS reporters, max(r.created_at)
  FROM public.safety_map_reports r
  WHERE auth.uid() IS NOT NULL
    AND r.created_at > now() - interval '180 days'
    AND r.cell_lat BETWEEN min_lat AND max_lat
    AND r.cell_lng BETWEEN min_lng AND max_lng
  GROUP BY r.cell_lat, r.cell_lng, r.category
  HAVING count(DISTINCT r.user_id) >= 3
  ORDER BY reporters DESC
  LIMIT 500
$$;
REVOKE EXECUTE ON FUNCTION public.get_safety_patterns(numeric,numeric,numeric,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_safety_patterns(numeric,numeric,numeric,numeric) TO authenticated;