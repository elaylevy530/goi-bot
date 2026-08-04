ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS pickup_instructions text;
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS pickup_instructions text,
  ADD COLUMN IF NOT EXISTS pickup_ready boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pickup_ready_at timestamptz;