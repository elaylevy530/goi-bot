ALTER TABLE public.couriers
  ADD COLUMN IF NOT EXISTS bank_details_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_details_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS bank_details_verified_by uuid;