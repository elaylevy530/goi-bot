
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS pickup_watchdog_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pickup_reminder_minutes integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS pickup_redispatch_minutes integer NOT NULL DEFAULT 5;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS pickup_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_redispatched_at timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_redispatch_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_jobs_pickup_watchdog
  ON public.jobs (selected_courier_id, delivery_status, accepted_at)
  WHERE selected_courier_id IS NOT NULL AND delivery_status = 'assigned';
