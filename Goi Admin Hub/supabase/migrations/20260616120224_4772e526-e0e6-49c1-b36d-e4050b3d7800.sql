
-- 1) Restrict UPDATE on public.couriers to safe profile columns only.
REVOKE UPDATE ON public.couriers FROM authenticated;
GRANT UPDATE (
  full_name, whatsapp_phone, base_city,
  working_areas, pickup_areas, dropoff_areas,
  custom_work_area, custom_pickup_area, custom_dropoff_area,
  work_distance_from_base,
  vehicle_types, vehicle_type, vehicle_label,
  max_distance, delivery_bag, has_thermal_bag, cargo_capacity, max_package_value,
  typical_hours, languages, preferred_job_types,
  gender, consent_whatsapp,
  courier_experience_status, courier_experience_duration,
  home_lat, home_lng,
  availability, job_types, experience,
  id_photo_url, id_document_url, id_photo_back_url,
  updated_at
) ON public.couriers TO authenticated;

-- 2) Restrict UPDATE on public.customers to safe profile columns only.
REVOKE UPDATE ON public.customers FROM authenticated;
GRANT UPDATE (
  name, phone, business_name, city, address, preferred_job_type, updated_at
) ON public.customers TO authenticated;

-- 3) Storage policies for the private 'courier-ids' bucket.
--    Allow couriers to manage files only under their own courier-id folder.
--    Path convention: '<courier_id>/...'.
DROP POLICY IF EXISTS "Couriers can upload own id docs" ON storage.objects;
CREATE POLICY "Couriers can upload own id docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'courier-ids'
    AND (storage.foldername(name))[1] = public.current_courier_id()::text
  );

DROP POLICY IF EXISTS "Couriers can update own id docs" ON storage.objects;
CREATE POLICY "Couriers can update own id docs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'courier-ids'
    AND (storage.foldername(name))[1] = public.current_courier_id()::text
  )
  WITH CHECK (
    bucket_id = 'courier-ids'
    AND (storage.foldername(name))[1] = public.current_courier_id()::text
  );

DROP POLICY IF EXISTS "Couriers can read own id docs" ON storage.objects;
CREATE POLICY "Couriers can read own id docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'courier-ids'
    AND (storage.foldername(name))[1] = public.current_courier_id()::text
  );

DROP POLICY IF EXISTS "Couriers or admins can delete own id docs" ON storage.objects;
CREATE POLICY "Couriers or admins can delete own id docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'courier-ids'
    AND (
      (storage.foldername(name))[1] = public.current_courier_id()::text
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Admins can update any courier-id doc" ON storage.objects;
CREATE POLICY "Admins can update any courier-id doc"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'courier-ids' AND public.is_admin())
  WITH CHECK (bucket_id = 'courier-ids' AND public.is_admin());

-- 4) Revoke EXECUTE on SECURITY DEFINER functions from public roles.
--    These are used internally by RLS policies or as trigger functions and
--    must not be directly callable by anon/authenticated via the Data API.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_courier_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_business_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_courier_stats(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_recompute_stats_offer() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_record_offer_from_whatsapp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_update_offers_on_job_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
