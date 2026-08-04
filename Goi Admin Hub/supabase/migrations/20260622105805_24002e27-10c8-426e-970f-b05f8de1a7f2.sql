
CREATE TABLE public.courier_password_resets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX courier_password_resets_phone_created_idx
  ON public.courier_password_resets (phone, created_at DESC);

GRANT ALL ON public.courier_password_resets TO service_role;

ALTER TABLE public.courier_password_resets ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (server) may read/write this table.
