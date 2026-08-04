CREATE TABLE IF NOT EXISTS public.wa_bot_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  state TEXT NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  courier_id UUID REFERENCES public.couriers(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  payload JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wa_bot_state_phone_idx ON public.wa_bot_state(phone, expires_at DESC);
CREATE INDEX IF NOT EXISTS wa_bot_state_job_idx ON public.wa_bot_state(job_id);

GRANT ALL ON public.wa_bot_state TO service_role;

ALTER TABLE public.wa_bot_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage wa_bot_state" ON public.wa_bot_state
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER wa_bot_state_updated_at
  BEFORE UPDATE ON public.wa_bot_state
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();