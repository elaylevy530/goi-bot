
-- 1) areas: allow signed-in users to read active areas
CREATE POLICY "areas: authenticated can read active"
ON public.areas FOR SELECT
TO authenticated
USING (true);

-- 2) chat-attachments: participant DELETE + UPDATE
CREATE POLICY "chat-attachments: participants can delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (
        c.courier_id = public.current_courier_id()
        OR c.business_id = public.current_business_id()
        OR public.is_admin()
      )
  )
);

CREATE POLICY "chat-attachments: participants can update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (
        c.courier_id = public.current_courier_id()
        OR c.business_id = public.current_business_id()
        OR public.is_admin()
      )
  )
);

-- 3) Column-level UPDATE restrictions on couriers (block sensitive fields)
REVOKE UPDATE ON public.couriers FROM authenticated;
GRANT UPDATE (
  full_name, whatsapp_phone, base_city, working_areas, vehicle_type, job_types,
  availability, experience, id_number, id_photo_url, delivery_bag, max_distance,
  vehicle_label, vehicle_types, custom_work_area, pickup_areas, custom_pickup_area,
  dropoff_areas, custom_dropoff_area, work_distance_from_base,
  courier_experience_status, courier_experience_duration, consent_whatsapp,
  id_document_url, gender, id_photo_back_url, has_thermal_bag, cargo_capacity,
  max_package_value, typical_hours, languages, preferred_job_types,
  home_lat, home_lng, last_lat, last_lng, last_location_at, location_sharing_enabled
) ON public.couriers TO authenticated;

-- 4) Column-level UPDATE restrictions on customers
REVOKE UPDATE ON public.customers FROM authenticated;
GRANT UPDATE (
  name, phone, business_name, city, address, preferred_job_type, notes, email,
  business_hours, default_delivery_price, permanent_courier_notes,
  notify_wa, notify_email, account_mode
) ON public.customers TO authenticated;
