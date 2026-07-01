
ALTER FUNCTION public.block_travel_geo_columns() SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.block_travel_geo_columns() FROM PUBLIC, anon, authenticated;
