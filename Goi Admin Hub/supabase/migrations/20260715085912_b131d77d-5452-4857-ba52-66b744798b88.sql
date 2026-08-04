
CREATE TABLE public.whatsapp_dispatch_settings (
  id boolean NOT NULL DEFAULT true PRIMARY KEY CHECK (id = true),
  couriers_group_id text,
  couriers_group_name text,
  movers_group_id text,
  movers_group_name text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE ON public.whatsapp_dispatch_settings TO authenticated;
GRANT ALL ON public.whatsapp_dispatch_settings TO service_role;

ALTER TABLE public.whatsapp_dispatch_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view dispatch group settings"
  ON public.whatsapp_dispatch_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert dispatch group settings"
  ON public.whatsapp_dispatch_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update dispatch group settings"
  ON public.whatsapp_dispatch_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.whatsapp_dispatch_settings (id) VALUES (true) ON CONFLICT DO NOTHING;
