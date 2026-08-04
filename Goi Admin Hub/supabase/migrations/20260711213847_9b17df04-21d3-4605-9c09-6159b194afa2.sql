
-- Allow anyone (including anonymous guests) to upload into a temporary
-- guest-order-photos/<random-token>/ folder. Reads use signed URLs.
CREATE POLICY "guest_orders_photos_insert_anyone"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'guest-order-photos');

CREATE POLICY "guest_orders_photos_read_service"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'guest-order-photos');

-- Authenticated users can list/read their own uploads if needed later.
CREATE POLICY "guest_orders_photos_read_owner"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'guest-order-photos' AND owner = auth.uid());
