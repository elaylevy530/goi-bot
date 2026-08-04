
DO $$ BEGIN
  CREATE POLICY "couriers can read own avatar" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'courier-avatars' AND EXISTS (
      SELECT 1 FROM public.couriers c WHERE c.user_id = auth.uid() AND c.id::text = (storage.foldername(name))[1]
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "couriers can upload own avatar" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'courier-avatars' AND EXISTS (
      SELECT 1 FROM public.couriers c WHERE c.user_id = auth.uid() AND c.id::text = (storage.foldername(name))[1]
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "couriers can update own avatar" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'courier-avatars' AND EXISTS (
      SELECT 1 FROM public.couriers c WHERE c.user_id = auth.uid() AND c.id::text = (storage.foldername(name))[1]
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "couriers can delete own avatar" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'courier-avatars' AND EXISTS (
      SELECT 1 FROM public.couriers c WHERE c.user_id = auth.uid() AND c.id::text = (storage.foldername(name))[1]
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admins can read all courier avatars" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'courier-avatars' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
