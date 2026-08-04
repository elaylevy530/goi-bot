CREATE INDEX IF NOT EXISTS idx_jobs_open_broadcast
  ON public.jobs (status, pricing_type, job_date)
  WHERE selected_courier_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_customer_status_null_courier
  ON public.jobs (customer_id, status)
  WHERE selected_courier_id IS NULL;

ANALYZE public.jobs;