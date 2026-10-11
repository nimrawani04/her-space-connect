GRANT SELECT, INSERT, DELETE ON public.safety_map_reports TO authenticated;
GRANT ALL ON public.safety_map_reports TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.safe_places TO authenticated;
GRANT ALL ON public.safe_places TO service_role;
GRANT EXECUTE ON FUNCTION public.get_safety_patterns(numeric, numeric, numeric, numeric) TO authenticated;