ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS signed_agreement_at timestamptz,
  ADD COLUMN IF NOT EXISTS signed_agreement_name text,
  ADD COLUMN IF NOT EXISTS signed_agreement_version text;