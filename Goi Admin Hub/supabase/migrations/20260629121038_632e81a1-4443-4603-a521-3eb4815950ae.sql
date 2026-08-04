ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS dropoff_building TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_entrance TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_floor TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_apartment TEXT;