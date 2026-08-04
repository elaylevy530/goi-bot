
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS paypal_order_id text,
  ADD COLUMN IF NOT EXISTS per_job_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS per_job_amount numeric;
CREATE INDEX IF NOT EXISTS idx_jobs_paypal_order_id ON public.jobs(paypal_order_id) WHERE paypal_order_id IS NOT NULL;
