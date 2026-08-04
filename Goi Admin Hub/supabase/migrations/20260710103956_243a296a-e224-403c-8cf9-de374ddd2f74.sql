ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS business_category text,
  ADD COLUMN IF NOT EXISTS service_type text CHECK (service_type IN ('couriers','moving','mixed'));