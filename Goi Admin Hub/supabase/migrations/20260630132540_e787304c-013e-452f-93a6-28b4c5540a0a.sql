
CREATE INDEX IF NOT EXISTS idx_jobs_customer_status_created
  ON public.jobs (customer_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_customer_status
  ON public.jobs (customer_id, status);

CREATE INDEX IF NOT EXISTS idx_jobs_customer_jobtype_created
  ON public.jobs (customer_id, job_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_customer_created
  ON public.jobs (customer_id, created_at DESC);

-- Open broadcast / dispatch pool lookup
CREATE INDEX IF NOT EXISTS idx_jobs_open_pool
  ON public.jobs (status, job_date)
  WHERE selected_courier_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_selected_courier_status
  ON public.jobs (selected_courier_id, status)
  WHERE selected_courier_id IS NOT NULL;

ANALYZE public.jobs;
