
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS favorites_fallback_minutes integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS favorites_first_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS favorites_only_dispatched_at timestamptz,
  ADD COLUMN IF NOT EXISTS favorites_only_fallback_done boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_jobs_favorites_pending
  ON public.jobs (favorites_only_dispatched_at)
  WHERE favorites_only_dispatched_at IS NOT NULL
    AND favorites_only_fallback_done = false
    AND selected_courier_id IS NULL;
