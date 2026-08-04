
-- Auto-sync couriers.balance from job_outcomes + withdrawal_requests
CREATE OR REPLACE FUNCTION public.recompute_courier_balance(_courier_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _earned numeric := 0;
  _paid numeric := 0;
BEGIN
  IF _courier_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(SUM(COALESCE(j.payment, 0) + COALESCE(o.tip_amount, 0)), 0)
    INTO _earned
    FROM public.job_outcomes o
    LEFT JOIN public.jobs j ON j.id = o.job_id
   WHERE o.courier_id = _courier_id
     AND o.delivered_at IS NOT NULL
     AND COALESCE(o.was_cancelled, false) = false;

  SELECT COALESCE(SUM(amount), 0)
    INTO _paid
    FROM public.withdrawal_requests
   WHERE courier_id = _courier_id
     AND status::text = 'שולמה';

  UPDATE public.couriers
     SET balance = GREATEST(0, _earned - _paid),
         updated_at = now()
   WHERE id = _courier_id;
END;
$$;

-- Trigger function for job_outcomes
CREATE OR REPLACE FUNCTION public.tg_recompute_balance_outcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.recompute_courier_balance(COALESCE(NEW.courier_id, OLD.courier_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recompute_balance_outcome ON public.job_outcomes;
CREATE TRIGGER trg_recompute_balance_outcome
AFTER INSERT OR UPDATE OR DELETE ON public.job_outcomes
FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_balance_outcome();

-- Trigger function for withdrawal_requests
CREATE OR REPLACE FUNCTION public.tg_recompute_balance_withdrawal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.recompute_courier_balance(COALESCE(NEW.courier_id, OLD.courier_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recompute_balance_withdrawal ON public.withdrawal_requests;
CREATE TRIGGER trg_recompute_balance_withdrawal
AFTER INSERT OR UPDATE OR DELETE ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_balance_withdrawal();

-- Trigger function for jobs (when payment or completion status changes)
CREATE OR REPLACE FUNCTION public.tg_recompute_balance_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _cid uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.payment, 0) IS DISTINCT FROM COALESCE(OLD.payment, 0)
       OR NEW.status::text IS DISTINCT FROM OLD.status::text
       OR NEW.selected_courier_id IS DISTINCT FROM OLD.selected_courier_id THEN
      SELECT courier_id INTO _cid FROM public.job_outcomes WHERE job_id = NEW.id LIMIT 1;
      IF _cid IS NOT NULL THEN
        PERFORM public.recompute_courier_balance(_cid);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recompute_balance_job ON public.jobs;
CREATE TRIGGER trg_recompute_balance_job
AFTER UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_balance_job();

-- Backfill all couriers' balances from current data
DO $$
DECLARE _c RECORD;
BEGIN
  FOR _c IN SELECT id FROM public.couriers LOOP
    PERFORM public.recompute_courier_balance(_c.id);
  END LOOP;
END $$;
