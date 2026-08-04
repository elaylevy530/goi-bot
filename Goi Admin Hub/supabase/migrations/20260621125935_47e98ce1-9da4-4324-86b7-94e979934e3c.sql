
CREATE OR REPLACE FUNCTION public.active_couriers_areas()
RETURNS TABLE(
  id uuid,
  base_city text,
  working_areas text[],
  pickup_areas text[],
  dropoff_areas text[],
  vehicle_type text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.base_city, c.working_areas, c.pickup_areas, c.dropoff_areas, c.vehicle_type::text
  FROM public.couriers c
  WHERE c.courier_status = 'פעיל'
$$;

GRANT EXECUTE ON FUNCTION public.active_couriers_areas() TO authenticated;
