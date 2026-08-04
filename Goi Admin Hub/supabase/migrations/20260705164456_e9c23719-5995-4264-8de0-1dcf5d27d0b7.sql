
-- Business dashboards (customer_id + status + created_at)
CREATE INDEX IF NOT EXISTS idx_jobs_customer_status_created
  ON public.jobs (customer_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_customer_created
  ON public.jobs (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_customer_jobtype_created
  ON public.jobs (customer_id, job_type, created_at DESC);

-- Open jobs feed for couriers: status = 'open' AND selected_courier_id IS NULL
CREATE INDEX IF NOT EXISTS idx_jobs_open_feed
  ON public.jobs (status, created_at DESC)
  WHERE selected_courier_id IS NULL;

-- Courier's own jobs list
CREATE INDEX IF NOT EXISTS idx_jobs_courier_status
  ON public.jobs (selected_courier_id, status)
  WHERE selected_courier_id IS NOT NULL;

-- Offer events lookup by courier + response
CREATE INDEX IF NOT EXISTS idx_offer_events_courier_response
  ON public.offer_events (courier_id, response, expires_at);

-- Courier declines lookup
CREATE INDEX IF NOT EXISTS idx_courier_job_declines_courier
  ON public.courier_job_declines (courier_id);
