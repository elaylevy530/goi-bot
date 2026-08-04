ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS notify_wa boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email boolean NOT NULL DEFAULT true;