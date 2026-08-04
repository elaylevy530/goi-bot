CREATE TABLE IF NOT EXISTS public.wa_maintenance (
  id boolean PRIMARY KEY DEFAULT true,
  enabled boolean NOT NULL DEFAULT false,
  allowlist text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT wa_maintenance_singleton CHECK (id = true)
);
GRANT SELECT ON public.wa_maintenance TO authenticated;
GRANT ALL ON public.wa_maintenance TO service_role;
ALTER TABLE public.wa_maintenance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage wa_maintenance" ON public.wa_maintenance;
CREATE POLICY "Admins manage wa_maintenance" ON public.wa_maintenance
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.wa_maintenance (id, enabled, allowlist)
VALUES (true, false, '{}')
ON CONFLICT (id) DO NOTHING;