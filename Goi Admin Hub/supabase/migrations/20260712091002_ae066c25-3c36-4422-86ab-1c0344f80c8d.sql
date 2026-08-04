
-- 1) Extra timestamps + cancellation reason on munch_orders
ALTER TABLE public.munch_orders
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2) Realtime for the tracking screen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'munch_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.munch_orders;
  END IF;
END $$;

-- 3) Customer can SELECT the courier job linked to their munch order (for live tracking)
DROP POLICY IF EXISTS "munch owner reads linked job" ON public.jobs;
CREATE POLICY "munch owner reads linked job"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.munch_orders mo
      WHERE mo.job_id = jobs.id AND mo.user_id = auth.uid()
    )
  );

-- 4) Customer cancel (only while pending)
CREATE OR REPLACE FUNCTION public.munch_cancel_own(_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _o RECORD;
BEGIN
  SELECT * INTO _o FROM public.munch_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _o.user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF _o.status NOT IN ('pending') THEN
    RAISE EXCEPTION 'Cannot cancel in status %', _o.status;
  END IF;
  UPDATE public.munch_orders
    SET status = 'cancelled', cancelled_at = now(), updated_at = now()
    WHERE id = _order_id;
  RETURN jsonb_build_object('ok', true);
END $$;

-- 5) Kiosk-side actions (admin-only until kiosk system is built)
CREATE OR REPLACE FUNCTION public.munch_confirm(_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _o RECORD;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO _o FROM public.munch_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _o.status <> 'pending' THEN RAISE EXCEPTION 'Invalid status: %', _o.status; END IF;
  UPDATE public.munch_orders
    SET status = 'preparing', confirmed_at = now(), updated_at = now()
    WHERE id = _order_id;
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.munch_reject(_order_id UUID, _reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _o RECORD;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO _o FROM public.munch_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _o.status NOT IN ('pending','preparing') THEN
    RAISE EXCEPTION 'Cannot reject in status %', _o.status;
  END IF;
  UPDATE public.munch_orders
    SET status = 'rejected', rejection_reason = _reason,
        cancelled_at = now(), updated_at = now()
    WHERE id = _order_id;
  RETURN jsonb_build_object('ok', true);
END $$;

-- 6) Kiosk marks ready => spawn a courier job (fixed price using kiosk defaults)
CREATE OR REPLACE FUNCTION public.munch_mark_ready(_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _o RECORD;
  _k RECORD;
  _job_id UUID;
  _payout NUMERIC;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO _o FROM public.munch_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _o.status NOT IN ('pending','preparing') THEN
    RAISE EXCEPTION 'Cannot mark ready in status %', _o.status;
  END IF;

  IF _o.job_id IS NULL THEN
    SELECT * INTO _k FROM public.kiosks WHERE id = _o.kiosk_id;
    _payout := COALESCE(_o.delivery_fee, 15);

    INSERT INTO public.jobs (
      job_type, customer_id, pickup_address, pickup_lat, pickup_lng,
      dropoff_address, dropoff_lat, dropoff_lng,
      recipient_name, recipient_phone,
      description, service_category, pricing_type, payment,
      customer_price, status, guest_name, guest_phone,
      package_type
    ) VALUES (
      'משלוח בודד'::job_type, NULL,
      _k.address, _k.lat, _k.lng,
      _o.dropoff_address, _o.dropoff_lat, _o.dropoff_lng,
      COALESCE(_o.guest_name, 'לקוח מאנצ׳'), _o.guest_phone,
      'הזמנת מאנצ׳ מ' || _k.name, 'munch', 'fixed_price', _payout,
      _o.total, 'נשלחה לשליחים'::job_status, _o.guest_name, _o.guest_phone,
      'שקית מאנצ׳'
    ) RETURNING id INTO _job_id;
  ELSE
    _job_id := _o.job_id;
  END IF;

  UPDATE public.munch_orders
    SET status = 'ready', ready_at = now(), job_id = _job_id, updated_at = now()
    WHERE id = _order_id;

  RETURN jsonb_build_object('ok', true, 'job_id', _job_id);
END $$;

-- 7) Trigger: mirror courier job progress back to munch_orders
CREATE OR REPLACE FUNCTION public.tg_munch_mirror_job()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.picked_up_at IS DISTINCT FROM OLD.picked_up_at AND NEW.picked_up_at IS NOT NULL THEN
    UPDATE public.munch_orders
      SET status = 'picked_up', picked_up_at = COALESCE(picked_up_at, NEW.picked_up_at), updated_at = now()
      WHERE job_id = NEW.id AND status IN ('ready','preparing');
  END IF;

  IF NEW.status::text = 'הושלמה' AND OLD.status::text IS DISTINCT FROM 'הושלמה' THEN
    UPDATE public.munch_orders
      SET status = 'delivered', delivered_at = COALESCE(delivered_at, now()), updated_at = now()
      WHERE job_id = NEW.id;
  END IF;

  IF NEW.status::text = 'בוטלה' AND OLD.status::text IS DISTINCT FROM 'בוטלה' THEN
    UPDATE public.munch_orders
      SET status = 'cancelled', cancelled_at = COALESCE(cancelled_at, now()), updated_at = now()
      WHERE job_id = NEW.id AND status NOT IN ('delivered','cancelled','rejected');
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS munch_mirror_job ON public.jobs;
CREATE TRIGGER munch_mirror_job
  AFTER UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.tg_munch_mirror_job();
