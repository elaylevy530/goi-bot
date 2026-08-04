
CREATE TABLE public.courier_admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  courier_id UUID REFERENCES public.couriers(id) ON DELETE CASCADE,
  audience TEXT NOT NULL DEFAULT 'single' CHECK (audience IN ('single','all')),
  title TEXT NOT NULL,
  body TEXT,
  link_url TEXT,
  sent_by UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_can_courier ON public.courier_admin_notifications(courier_id, created_at DESC);
CREATE INDEX idx_can_audience ON public.courier_admin_notifications(audience, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.courier_admin_notifications TO authenticated;
GRANT ALL ON public.courier_admin_notifications TO service_role;

ALTER TABLE public.courier_admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all" ON public.courier_admin_notifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Couriers read their own or broadcasts" ON public.courier_admin_notifications FOR SELECT TO authenticated
  USING (
    audience = 'all'
    OR courier_id IN (SELECT id FROM public.couriers WHERE user_id = auth.uid())
  );

CREATE POLICY "Couriers can mark read" ON public.courier_admin_notifications FOR UPDATE TO authenticated
  USING (
    audience = 'all'
    OR courier_id IN (SELECT id FROM public.couriers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    audience = 'all'
    OR courier_id IN (SELECT id FROM public.couriers WHERE user_id = auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.courier_admin_notifications;
