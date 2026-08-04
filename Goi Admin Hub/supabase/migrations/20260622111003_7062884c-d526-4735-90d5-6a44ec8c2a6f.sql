create or replace function public.business_area_couriers()
returns table(
  marker_id text,
  vehicle_type text,
  base_city text,
  working_areas text[],
  pickup_areas text[],
  dropoff_areas text[],
  last_lat numeric,
  last_lng numeric,
  home_lat numeric,
  home_lng numeric,
  last_location_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    encode(extensions.digest(c.id::text, 'sha1'), 'hex') as marker_id,
    c.vehicle_type::text,
    c.base_city,
    c.working_areas,
    c.pickup_areas,
    c.dropoff_areas,
    c.last_lat,
    c.last_lng,
    c.home_lat,
    c.home_lng,
    c.last_location_at
  from public.couriers c
  where c.courier_status = 'פעיל'
$$;

grant execute on function public.business_area_couriers() to authenticated;