CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.active_couriers_map()
RETURNS TABLE(
  marker_id text,
  vehicle_type text,
  base_city text,
  lat numeric,
  lng numeric,
  last_location_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    encode(extensions.digest(c.id::text, 'sha1'), 'hex') AS marker_id,
    c.vehicle_type::text,
    c.base_city,
    c.last_lat,
    c.last_lng,
    c.last_location_at
  FROM public.couriers c
  WHERE c.courier_status = 'פעיל'
    AND c.last_lat IS NOT NULL
    AND c.last_lng IS NOT NULL
    AND c.last_location_at >= now() - interval '30 minutes'
$$;

GRANT EXECUTE ON FUNCTION public.active_couriers_map() TO authenticated;