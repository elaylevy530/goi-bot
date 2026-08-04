
-- 1) business_integrations
CREATE TABLE public.business_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE,
  integration_token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  webhook_secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  auto_mode BOOLEAN NOT NULL DEFAULT true,
  default_pricing_type TEXT NOT NULL DEFAULT 'fixed',
  default_fixed_price NUMERIC,
  allowed_origins TEXT[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_integrations TO authenticated;
GRANT ALL ON public.business_integrations TO service_role;

ALTER TABLE public.business_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business owners read own integration"
  ON public.business_integrations FOR SELECT TO authenticated
  USING (business_id = public.current_business_id() OR public.is_admin());

CREATE POLICY "business owners insert own integration"
  ON public.business_integrations FOR INSERT TO authenticated
  WITH CHECK (business_id = public.current_business_id() OR public.is_admin());

CREATE POLICY "business owners update own integration"
  ON public.business_integrations FOR UPDATE TO authenticated
  USING (business_id = public.current_business_id() OR public.is_admin())
  WITH CHECK (business_id = public.current_business_id() OR public.is_admin());

CREATE TRIGGER trg_business_integrations_updated_at
  BEFORE UPDATE ON public.business_integrations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 2) integration_request_logs
CREATE TABLE public.integration_request_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'api',
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'ok',
  error TEXT,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_integration_logs_business_created
  ON public.integration_request_logs (business_id, created_at DESC);

GRANT SELECT ON public.integration_request_logs TO authenticated;
GRANT ALL ON public.integration_request_logs TO service_role;

ALTER TABLE public.integration_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business owners read own logs"
  ON public.integration_request_logs FOR SELECT TO authenticated
  USING (business_id = public.current_business_id() OR public.is_admin());

-- 3) Seed integrations for existing businesses
INSERT INTO public.business_integrations (business_id)
SELECT c.id FROM public.customers c
WHERE NOT EXISTS (SELECT 1 FROM public.business_integrations bi WHERE bi.business_id = c.id);
