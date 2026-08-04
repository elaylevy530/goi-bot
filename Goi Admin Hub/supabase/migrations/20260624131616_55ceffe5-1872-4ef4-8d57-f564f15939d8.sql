ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS pickup_contact_name text,
  ADD COLUMN IF NOT EXISTS pickup_contact_phone text,
  ADD COLUMN IF NOT EXISTS pickup_address text;