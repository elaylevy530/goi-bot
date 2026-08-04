ALTER TABLE public.couriers ADD COLUMN IF NOT EXISTS is_paused boolean NOT NULL DEFAULT false;
ALTER TABLE public.couriers ADD COLUMN IF NOT EXISTS paused_at timestamptz;
ALTER TABLE public.couriers ADD COLUMN IF NOT EXISTS paused_reason text;