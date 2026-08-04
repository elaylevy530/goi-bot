
CREATE POLICY "chat-attachments: participants can read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = split_part(name, '/', 1)
      AND (
        public.has_role(auth.uid(),'admin')
        OR (c.courier_id IS NOT NULL AND c.courier_id = public.current_courier_id())
        OR (c.business_id IS NOT NULL AND c.business_id = public.current_business_id())
      )
  )
);

CREATE POLICY "chat-attachments: participants can upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = split_part(name, '/', 1)
      AND (
        public.has_role(auth.uid(),'admin')
        OR (c.courier_id IS NOT NULL AND c.courier_id = public.current_courier_id())
        OR (c.business_id IS NOT NULL AND c.business_id = public.current_business_id())
      )
  )
);
