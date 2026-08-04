
-- 1) Internal admin block flag (invisible to courier)
ALTER TABLE public.couriers
  ADD COLUMN IF NOT EXISTS admin_jobs_blocked boolean NOT NULL DEFAULT false;

-- 2) Active-courier RPCs respect the admin block
CREATE OR REPLACE FUNCTION public.current_active_courier_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT id FROM public.couriers
  WHERE user_id = auth.uid()
    AND courier_status = 'פעיל'
    AND COALESCE(is_paused, false) = false
    AND COALESCE(admin_jobs_blocked, false) = false
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_approved_courier_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT id FROM public.couriers
  WHERE user_id = auth.uid()
    AND courier_status = 'פעיל'
    AND COALESCE(admin_jobs_blocked, false) = false
  LIMIT 1
$$;

-- 3) Matching/listing RPCs exclude admin-blocked couriers
CREATE OR REPLACE FUNCTION public.nearby_active_couriers(_pickup_lat numeric, _pickup_lng numeric, _radius_km numeric DEFAULT 10, _limit integer DEFAULT 20)
RETURNS TABLE(courier_id uuid, full_name text, whatsapp_phone text, vehicle_type text, last_lat numeric, last_lng numeric, last_location_at timestamp with time zone, distance_km numeric, acceptance_rate numeric, avg_rating numeric, score numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH base AS (
    SELECT
      c.id AS courier_id, c.full_name, c.whatsapp_phone, c.vehicle_type::text AS vehicle_type,
      c.last_lat, c.last_lng, c.last_location_at,
      (2 * 6371 * asin(sqrt(
        power(sin(radians((c.last_lat - _pickup_lat) / 2)), 2)
        + cos(radians(_pickup_lat)) * cos(radians(c.last_lat))
        * power(sin(radians((c.last_lng - _pickup_lng) / 2)), 2)
      )))::numeric AS distance_km,
      COALESCE(cs.acceptance_rate, 0)::numeric AS acceptance_rate, cs.avg_rating
    FROM public.couriers c
    LEFT JOIN public.courier_stats cs ON cs.courier_id = c.id
    WHERE c.courier_status = 'פעיל'
      AND COALESCE(c.admin_jobs_blocked, false) = false
      AND c.location_sharing_enabled = true
      AND c.last_lat IS NOT NULL AND c.last_lng IS NOT NULL
      AND c.last_location_at > now() - interval '10 minutes'
  )
  SELECT courier_id, full_name, whatsapp_phone, vehicle_type,
    last_lat, last_lng, last_location_at,
    round(distance_km::numeric, 2) AS distance_km, acceptance_rate, avg_rating,
    round((GREATEST(0, 50 - (distance_km * 5)) + COALESCE(avg_rating, 3) * 5 + (acceptance_rate / 4))::numeric, 2) AS score
  FROM base WHERE distance_km <= _radius_km
  ORDER BY score DESC, distance_km ASC LIMIT _limit;
$$;

CREATE OR REPLACE FUNCTION public.active_couriers_map()
RETURNS TABLE(marker_id text, vehicle_type text, base_city text, lat numeric, lng numeric, last_location_at timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT encode(extensions.digest(c.id::text, 'sha1'), 'hex') AS marker_id,
    c.vehicle_type::text, c.base_city, c.last_lat, c.last_lng, c.last_location_at
  FROM public.couriers c
  WHERE c.courier_status = 'פעיל'
    AND COALESCE(c.admin_jobs_blocked, false) = false
    AND c.last_lat IS NOT NULL AND c.last_lng IS NOT NULL
    AND c.last_location_at >= now() - interval '30 minutes'
$$;

CREATE OR REPLACE FUNCTION public.business_area_couriers()
RETURNS TABLE(marker_id text, vehicle_type text, base_city text, working_areas text[], pickup_areas text[], dropoff_areas text[], last_lat numeric, last_lng numeric, home_lat numeric, home_lng numeric, last_location_at timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT encode(extensions.digest(c.id::text, 'sha1'), 'hex') AS marker_id,
    c.vehicle_type::text, c.base_city, c.working_areas, c.pickup_areas, c.dropoff_areas,
    c.last_lat, c.last_lng, c.home_lat, c.home_lng, c.last_location_at
  FROM public.couriers c
  WHERE c.courier_status = 'פעיל'
    AND COALESCE(c.admin_jobs_blocked, false) = false
$$;

CREATE OR REPLACE FUNCTION public.active_couriers_areas()
RETURNS TABLE(id uuid, base_city text, working_areas text[], pickup_areas text[], dropoff_areas text[], vehicle_type text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT c.id, c.base_city, c.working_areas, c.pickup_areas, c.dropoff_areas, c.vehicle_type::text
  FROM public.couriers c
  WHERE c.courier_status = 'פעיל'
    AND COALESCE(c.admin_jobs_blocked, false) = false
$$;

-- 4) Revert couriers that never received the approval welcome message back to pending
UPDATE public.couriers c
   SET courier_status = 'ממתין לאישור'::public.courier_status,
       accepting_jobs = false,
       admin_jobs_blocked = false,
       updated_at = now()
 WHERE c.courier_status::text = 'פעיל'
   AND NOT EXISTS (
     SELECT 1 FROM public.whatsapp_messages w
     WHERE w.courier_id = c.id
       AND w.direction = 'outbound'
       AND (w.body ILIKE '%אושר והופעל%' OR w.body ILIKE '%ברוך הבא ל-Goi%')
   );

-- 5) Mark remaining active couriers as admin-blocked (they see themselves active, but cannot receive jobs)
UPDATE public.couriers
   SET admin_jobs_blocked = true,
       updated_at = now()
 WHERE courier_status::text = 'פעיל';
