
-- Add pricing_type and quote-related fields to jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS pricing_type TEXT NOT NULL DEFAULT 'fixed_price' CHECK (pricing_type IN ('fixed_price','quote_request')),
  ADD COLUMN IF NOT EXISTS quote_deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_quotes_to_show INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS selected_quote_id UUID,
  ADD COLUMN IF NOT EXISTS final_price NUMERIC(10,2);

-- Quote status enum
DO $$ BEGIN
  CREATE TYPE public.quote_status AS ENUM ('pending','shortlisted','selected','rejected','expired','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- job_quotes table
CREATE TABLE IF NOT EXISTS public.job_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  courier_id UUID NOT NULL REFERENCES public.couriers(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  estimated_arrival_minutes INTEGER,
  estimated_delivery_minutes INTEGER,
  note TEXT,
  includes_invoice BOOLEAN NOT NULL DEFAULT false,
  is_final_price BOOLEAN NOT NULL DEFAULT true,
  status public.quote_status NOT NULL DEFAULT 'pending',
  courier_rating_snapshot NUMERIC(3,2),
  courier_completed_jobs_snapshot INTEGER,
  courier_response_time_snapshot INTEGER,
  selected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, courier_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_quotes TO authenticated;
GRANT ALL ON public.job_quotes TO service_role;

CREATE INDEX IF NOT EXISTS idx_job_quotes_job ON public.job_quotes(job_id);
CREATE INDEX IF NOT EXISTS idx_job_quotes_courier ON public.job_quotes(courier_id);
CREATE INDEX IF NOT EXISTS idx_job_quotes_status ON public.job_quotes(status);

ALTER TABLE public.job_quotes ENABLE ROW LEVEL SECURITY;

-- Admin manages everything
CREATE POLICY "Admins manage job_quotes" ON public.job_quotes
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Courier reads own quotes
CREATE POLICY "Courier reads own quotes" ON public.job_quotes
  FOR SELECT TO authenticated
  USING (courier_id = public.current_courier_id());

-- Courier inserts own quote
CREATE POLICY "Courier inserts own quote" ON public.job_quotes
  FOR INSERT TO authenticated
  WITH CHECK (courier_id = public.current_courier_id());

-- Courier updates own pending/shortlisted quote
CREATE POLICY "Courier updates own quote" ON public.job_quotes
  FOR UPDATE TO authenticated
  USING (courier_id = public.current_courier_id() AND status IN ('pending','shortlisted'))
  WITH CHECK (courier_id = public.current_courier_id());

-- Business reads shortlisted/selected/rejected for their jobs
CREATE POLICY "Business reads quotes on own jobs" ON public.job_quotes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_quotes.job_id
        AND j.customer_id = public.current_business_id()
    )
    AND status IN ('shortlisted','selected','rejected','expired')
  );

-- updated_at trigger
DROP TRIGGER IF EXISTS tg_job_quotes_updated_at ON public.job_quotes;
CREATE TRIGGER tg_job_quotes_updated_at BEFORE UPDATE ON public.job_quotes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- RPC: submit_job_quote (insert or update own quote)
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_job_quote(
  _job_id UUID,
  _price NUMERIC,
  _estimated_arrival_minutes INTEGER DEFAULT NULL,
  _estimated_delivery_minutes INTEGER DEFAULT NULL,
  _note TEXT DEFAULT NULL,
  _includes_invoice BOOLEAN DEFAULT false,
  _is_final_price BOOLEAN DEFAULT true
) RETURNS public.job_quotes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cid UUID := public.current_courier_id();
  _job RECORD;
  _q public.job_quotes;
  _stats RECORD;
BEGIN
  IF _cid IS NULL THEN RAISE EXCEPTION 'Not a courier'; END IF;
  SELECT id, customer_id, pricing_type, status, selected_quote_id, quote_deadline_at
    INTO _job FROM public.jobs WHERE id = _job_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job not found'; END IF;
  IF _job.pricing_type <> 'quote_request' THEN RAISE EXCEPTION 'Job is not a quote request'; END IF;
  IF _job.selected_quote_id IS NOT NULL THEN RAISE EXCEPTION 'Job already has a selected quote'; END IF;
  IF _job.status::text IN ('בוטלה','הושלמה') THEN RAISE EXCEPTION 'Job is closed'; END IF;
  IF _job.quote_deadline_at IS NOT NULL AND _job.quote_deadline_at < now() THEN
    RAISE EXCEPTION 'Quote deadline passed';
  END IF;

  SELECT avg_rating, jobs_completed, avg_response_seconds
    INTO _stats FROM public.courier_stats WHERE courier_id = _cid;

  INSERT INTO public.job_quotes (
    job_id, courier_id, customer_id, price,
    estimated_arrival_minutes, estimated_delivery_minutes, note,
    includes_invoice, is_final_price, status,
    courier_rating_snapshot, courier_completed_jobs_snapshot, courier_response_time_snapshot
  ) VALUES (
    _job_id, _cid, _job.customer_id, _price,
    _estimated_arrival_minutes, _estimated_delivery_minutes, _note,
    _includes_invoice, _is_final_price, 'pending',
    _stats.avg_rating, _stats.jobs_completed, _stats.avg_response_seconds
  )
  ON CONFLICT (job_id, courier_id) DO UPDATE SET
    price = EXCLUDED.price,
    estimated_arrival_minutes = EXCLUDED.estimated_arrival_minutes,
    estimated_delivery_minutes = EXCLUDED.estimated_delivery_minutes,
    note = EXCLUDED.note,
    includes_invoice = EXCLUDED.includes_invoice,
    is_final_price = EXCLUDED.is_final_price,
    updated_at = now()
  WHERE public.job_quotes.status IN ('pending','shortlisted')
  RETURNING * INTO _q;

  -- recompute shortlist
  PERFORM public.refresh_quote_shortlist(_job_id);
  RETURN _q;
END $$;

-- ============================================================
-- RPC: refresh_quote_shortlist — picks top N by score
-- ============================================================
CREATE OR REPLACE FUNCTION public.refresh_quote_shortlist(_job_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _max INTEGER;
  _min_price NUMERIC;
BEGIN
  SELECT max_quotes_to_show INTO _max FROM public.jobs WHERE id = _job_id;
  IF _max IS NULL THEN _max := 3; END IF;

  SELECT MIN(price) INTO _min_price FROM public.job_quotes
    WHERE job_id = _job_id AND status IN ('pending','shortlisted');

  IF _min_price IS NULL THEN RETURN; END IF;

  WITH scored AS (
    SELECT id,
      -- lower price better, higher rating better, faster arrival better
      ( (_min_price / NULLIF(price,0)) * 50
        + COALESCE(courier_rating_snapshot, 4.0) * 8
        + GREATEST(0, 30 - COALESCE(estimated_arrival_minutes, 30)) * 0.5
        + LEAST(COALESCE(courier_completed_jobs_snapshot,0), 100) * 0.05
      ) AS score
    FROM public.job_quotes
    WHERE job_id = _job_id AND status IN ('pending','shortlisted')
  ),
  ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC) AS rnk FROM scored
  )
  UPDATE public.job_quotes q
     SET status = CASE WHEN r.rnk <= _max THEN 'shortlisted'::quote_status ELSE 'pending'::quote_status END,
         updated_at = now()
    FROM ranked r
   WHERE q.id = r.id
     AND q.status IN ('pending','shortlisted');
END $$;

-- ============================================================
-- RPC: select_job_quote — business chooses a quote
-- ============================================================
CREATE OR REPLACE FUNCTION public.select_job_quote(_quote_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _bid UUID := public.current_business_id();
  _is_admin BOOLEAN := public.is_admin();
  _q RECORD;
  _job RECORD;
BEGIN
  SELECT * INTO _q FROM public.job_quotes WHERE id = _quote_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote not found'; END IF;

  SELECT * INTO _job FROM public.jobs WHERE id = _q.job_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job not found'; END IF;

  IF NOT _is_admin AND _job.customer_id IS DISTINCT FROM _bid THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF _job.selected_quote_id IS NOT NULL THEN
    RAISE EXCEPTION 'Job already has a selected quote';
  END IF;

  UPDATE public.job_quotes
     SET status = 'selected'::quote_status, selected_at = now(), updated_at = now()
   WHERE id = _quote_id;

  UPDATE public.job_quotes
     SET status = 'rejected'::quote_status, updated_at = now()
   WHERE job_id = _q.job_id AND id <> _quote_id
     AND status IN ('pending','shortlisted');

  UPDATE public.jobs
     SET selected_quote_id = _quote_id,
         selected_courier_id = _q.courier_id,
         final_price = _q.price,
         payment = _q.price,
         status = 'נבחר שליח'::job_status,
         updated_at = now()
   WHERE id = _q.job_id;

  RETURN jsonb_build_object('ok', true, 'quote_id', _quote_id, 'courier_id', _q.courier_id);
END $$;

-- ============================================================
-- RPC: cancel_job_quote — courier withdraws their own quote
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_job_quote(_quote_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cid UUID := public.current_courier_id();
  _q RECORD;
BEGIN
  SELECT * INTO _q FROM public.job_quotes WHERE id = _quote_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote not found'; END IF;
  IF _q.courier_id <> _cid AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF _q.status NOT IN ('pending','shortlisted') THEN
    RAISE EXCEPTION 'Cannot cancel quote in status %', _q.status;
  END IF;
  UPDATE public.job_quotes
     SET status = 'cancelled'::quote_status, updated_at = now()
   WHERE id = _quote_id;
  PERFORM public.refresh_quote_shortlist(_q.job_id);
END $$;

GRANT EXECUTE ON FUNCTION public.submit_job_quote(UUID, NUMERIC, INTEGER, INTEGER, TEXT, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.select_job_quote(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_job_quote(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_quote_shortlist(UUID) TO authenticated;
