
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS notify_recipient_allowed boolean NOT NULL DEFAULT false;

-- Make business preference default off too; admin must enable first.
ALTER TABLE public.customers
  ALTER COLUMN notify_recipient_enabled SET DEFAULT false;

-- Existing businesses: keep enabled flag, but lock until admin allows.
UPDATE public.customers SET notify_recipient_allowed = false WHERE notify_recipient_allowed IS NULL;
