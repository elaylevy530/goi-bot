
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS base_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price_per_km NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS estimated_distance_km NUMERIC(6,2);

-- Extend pricing_type CHECK to allow distance_based
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_pricing_type_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_pricing_type_check
  CHECK (pricing_type IN ('fixed_price','quote_request','distance_based'));
