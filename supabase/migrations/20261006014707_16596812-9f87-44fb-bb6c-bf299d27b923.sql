CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;
DROP FUNCTION public.get_safety_patterns(numeric,numeric,numeric,numeric);
CREATE OR REPLACE FUNCTION private.safety_patterns(min_lat numeric, max_lat numeric, min_lng numeric, max_lng numeric)
RETURNS TABLE(cell_lat numeric, cell_lng numeric, category text, time_window text, reporters bigint, last_reported timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.cell_lat, r.cell_lng, r.category,
         mode() WITHIN GROUP (ORDER BY r.time_window),
         count(DISTINCT r.user_id), max(r.created_at)
  FROM public.safety_map_reports r
  WHERE auth.uid() IS NOT NULL
    AND r.created_at > now() - interval '180 days'
    AND r.cell_lat BETWEEN min_lat AND max_lat
    AND r.cell_lng BETWEEN min_lng AND max_lng
  GROUP BY r.cell_lat, r.cell_lng, r.category
  HAVING count(DISTINCT r.user_id) >= 3
  ORDER BY 5 DESC
  LIMIT 500
$$;
REVOKE EXECUTE ON FUNCTION private.safety_patterns(numeric,numeric,numeric,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.safety_patterns(numeric,numeric,numeric,numeric) TO authenticated;
CREATE OR REPLACE FUNCTION public.get_safety_patterns(min_lat numeric, max_lat numeric, min_lng numeric, max_lng numeric)
RETURNS TABLE(cell_lat numeric, cell_lng numeric, category text, time_window text, reporters bigint, last_reported timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT * FROM private.safety_patterns(min_lat, max_lat, min_lng, max_lng)
$$;
REVOKE EXECUTE ON FUNCTION public.get_safety_patterns(numeric,numeric,numeric,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_safety_patterns(numeric,numeric,numeric,numeric) TO authenticated;