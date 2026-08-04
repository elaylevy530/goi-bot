
-- 1) Add location columns to couriers
ALTER TABLE public.couriers
  ADD COLUMN IF NOT EXISTS last_lat numeric,
  ADD COLUMN IF NOT EXISTS last_lng numeric,
  ADD COLUMN IF NOT EXISTS last_location_at timestamptz,
  ADD COLUMN IF NOT EXISTS location_sharing_enabled boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_couriers_active_loc
  ON public.couriers (courier_status, last_location_at);

-- 2) RLS: let couriers insert/select own pings
CREATE POLICY "Couriers insert own pings"
  ON public.courier_location_pings
  FOR INSERT TO authenticated
  WITH CHECK (courier_id = public.current_courier_id());

CREATE POLICY "Couriers read own pings"
  ON public.courier_location_pings
  FOR SELECT TO authenticated
  USING (courier_id = public.current_courier_id() OR public.is_admin());

CREATE INDEX IF NOT EXISTS idx_pings_courier_time
  ON public.courier_location_pings (courier_id, recorded_at DESC);

-- 3) Trigger: update couriers.last_* when a ping is inserted
CREATE OR REPLACE FUNCTION public.tg_update_courier_last_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.couriers
     SET last_lat = NEW.lat,
         last_lng = NEW.lng,
         last_location_at = NEW.recorded_at
   WHERE id = NEW.courier_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_courier_last_location ON public.courier_location_pings;
CREATE TRIGGER trg_update_courier_last_location
  AFTER INSERT ON public.courier_location_pings
  FOR EACH ROW EXECUTE FUNCTION public.tg_update_courier_last_location();

-- 4) Nearby active couriers — combined score (distance + rating + acceptance + freshness)
CREATE OR REPLACE FUNCTION public.nearby_active_couriers(
  _pickup_lat numeric,
  _pickup_lng numeric,
  _radius_km numeric DEFAULT 10,
  _limit int DEFAULT 20
)
RETURNS TABLE (
  courier_id uuid,
  full_name text,
  whatsapp_phone text,
  vehicle_type text,
  last_lat numeric,
  last_lng numeric,
  last_location_at timestamptz,
  distance_km numeric,
  acceptance_rate numeric,
  avg_rating numeric,
  score numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      c.id AS courier_id,
      c.full_name,
      c.whatsapp_phone,
      c.vehicle_type::text AS vehicle_type,
      c.last_lat,
      c.last_lng,
      c.last_location_at,
      -- Haversine (km)
      (2 * 6371 * asin(sqrt(
        power(sin(radians((c.last_lat - _pickup_lat) / 2)), 2)
        + cos(radians(_pickup_lat)) * cos(radians(c.last_lat))
        * power(sin(radians((c.last_lng - _pickup_lng) / 2)), 2)
      )))::numeric AS distance_km,
      COALESCE(cs.acceptance_rate, 0)::numeric AS acceptance_rate,
      cs.avg_rating
    FROM public.couriers c
    LEFT JOIN public.courier_stats cs ON cs.courier_id = c.id
    WHERE c.courier_status = 'פעיל'
      AND c.location_sharing_enabled = true
      AND c.last_lat IS NOT NULL
      AND c.last_lng IS NOT NULL
      AND c.last_location_at > now() - interval '10 minutes'
  )
  SELECT
    courier_id, full_name, whatsapp_phone, vehicle_type,
    last_lat, last_lng, last_location_at,
    round(distance_km::numeric, 2) AS distance_km,
    acceptance_rate,
    avg_rating,
    -- Score: closer is better (max 50), rating up to 25, acceptance up to 25
    round((
      GREATEST(0, 50 - (distance_km * 5))
      + COALESCE(avg_rating, 3) * 5
      + (acceptance_rate / 4)
    )::numeric, 2) AS score
  FROM base
  WHERE distance_km <= _radius_km
  ORDER BY score DESC, distance_km ASC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.nearby_active_couriers(numeric, numeric, numeric, int) TO authenticated, service_role;
