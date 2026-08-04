CREATE TABLE public.wa_poll_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  options JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX wa_poll_options_phone_created_idx
  ON public.wa_poll_options (phone, created_at DESC);

GRANT ALL ON public.wa_poll_options TO service_role;

ALTER TABLE public.wa_poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
  ON public.wa_poll_options
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);