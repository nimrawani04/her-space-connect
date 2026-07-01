
CREATE OR REPLACE FUNCTION public.block_travel_geo_columns()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
DECLARE
  r record;
  colname text;
BEGIN
  FOR r IN
    SELECT objid::regclass::text AS tbl
    FROM pg_event_trigger_ddl_commands()
    WHERE object_type IN ('table', 'table column')
  LOOP
    IF r.tbl LIKE 'travel_%' OR r.tbl LIKE 'public.travel_%' THEN
      FOR colname IN
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = split_part(r.tbl, '.', greatest(1, array_length(string_to_array(r.tbl, '.'), 1)))
      LOOP
        IF colname ILIKE ANY (ARRAY['latitude','longitude','lat','lng','lon','coordinates','geo','geom','location_point']) THEN
          RAISE EXCEPTION 'Coordinate column "%" is forbidden on travel table %', colname, r.tbl;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS block_travel_geo_columns_trg;
CREATE EVENT TRIGGER block_travel_geo_columns_trg
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'ALTER TABLE')
  EXECUTE FUNCTION public.block_travel_geo_columns();
