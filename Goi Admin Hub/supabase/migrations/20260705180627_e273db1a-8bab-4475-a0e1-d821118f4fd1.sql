ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS invoice_required boolean NOT NULL DEFAULT false;