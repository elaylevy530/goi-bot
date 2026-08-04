CREATE POLICY "Admins read courier id photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'courier-ids' AND public.is_admin());