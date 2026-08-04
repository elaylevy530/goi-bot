ALTER TYPE public.courier_status ADD VALUE IF NOT EXISTS 'מושהה';

CREATE OR REPLACE FUNCTION public.current_active_courier_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id
  FROM public.couriers
  WHERE user_id = auth.uid()
    AND courier_status = 'פעיל'
    AND COALESCE(is_paused, false) = false
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.tg_guard_courier_self_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF OLD.user_id = auth.uid() THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Cannot change account owner';
    END IF;

    IF COALESCE(NEW.is_paused, false) IS DISTINCT FROM COALESCE(OLD.is_paused, false)
       OR NEW.paused_at IS DISTINCT FROM OLD.paused_at
       OR NEW.paused_reason IS DISTINCT FROM OLD.paused_reason THEN
      RAISE EXCEPTION 'Only admin can change courier pause state';
    END IF;

    IF NEW.courier_status IS DISTINCT FROM OLD.courier_status THEN
      IF OLD.courier_status::text IN ('פעיל', 'לא פעיל')
         AND NEW.courier_status::text IN ('פעיל', 'לא פעיל') THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'Only admin can approve or activate courier status';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_courier_self_status ON public.couriers;
CREATE TRIGGER guard_courier_self_status
BEFORE UPDATE ON public.couriers
FOR EACH ROW
EXECUTE FUNCTION public.tg_guard_courier_self_status();

CREATE OR REPLACE FUNCTION public.complete_signup_profile(_role text, _full_name text, _phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid UUID := auth.uid();
  _new_id UUID;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _role NOT IN ('courier','business') THEN
    RAISE EXCEPTION 'Invalid role: %', _role;
  END IF;

  IF _role = 'courier' THEN
    SELECT id INTO _new_id FROM public.couriers WHERE whatsapp_phone = _phone LIMIT 1;
    IF _new_id IS NOT NULL THEN
      UPDATE public.couriers
        SET user_id = COALESCE(user_id, _uid),
            full_name = COALESCE(NULLIF(full_name,''), NULLIF(_full_name,''), full_name),
            courier_status = CASE
              WHEN courier_status::text IN ('פעיל','לא פעיל','מושהה','חסום') THEN courier_status
              ELSE 'ממתין לאישור'::public.courier_status
            END
        WHERE id = _new_id;
    ELSE
      INSERT INTO public.couriers (user_id, full_name, whatsapp_phone, courier_status)
      VALUES (_uid, COALESCE(NULLIF(_full_name,''), _phone), _phone, 'ממתין לאישור')
      RETURNING id INTO _new_id;
    END IF;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'courier'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    SELECT id INTO _new_id FROM public.customers WHERE phone = _phone LIMIT 1;
    IF _new_id IS NOT NULL THEN
      UPDATE public.customers SET user_id = COALESCE(user_id, _uid) WHERE id = _new_id;
    ELSE
      INSERT INTO public.customers (user_id, name, phone, customer_type, status)
      VALUES (_uid, COALESCE(NULLIF(_full_name,''), _phone), _phone, 'אחר', 'חדש')
      RETURNING id INTO _new_id;
    END IF;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'business'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('id', _new_id, 'role', _role);
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_update_offers_on_job_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.selected_courier_id IS NOT NULL
     AND NEW.selected_courier_id IS DISTINCT FROM OLD.selected_courier_id THEN
    UPDATE public.offer_events
       SET response = 'accepted', responded_at = COALESCE(responded_at, now())
     WHERE job_id = NEW.id AND courier_id = NEW.selected_courier_id AND response = 'pending';

    UPDATE public.offer_events
       SET response = 'cancelled', responded_at = COALESCE(responded_at, now())
     WHERE job_id = NEW.id
       AND courier_id <> NEW.selected_courier_id
       AND response = 'pending';
  END IF;

  IF NEW.status::text IN ('בוטלה', 'הושלמה')
     AND OLD.status::text IS DISTINCT FROM NEW.status::text THEN
    UPDATE public.offer_events
       SET response = 'cancelled', responded_at = COALESCE(responded_at, now())
     WHERE job_id = NEW.id AND response = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_offers_on_job_change ON public.jobs;
CREATE TRIGGER update_offers_on_job_change
AFTER UPDATE OF selected_courier_id, status ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.tg_update_offers_on_job_change();

CREATE OR REPLACE FUNCTION public.courier_claim_job(_job_id uuid, _source text DEFAULT 'app'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _cid UUID := public.current_active_courier_id();
  _job RECORD;
  _updated INT;
BEGIN
  IF _cid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_active');
  END IF;

  SELECT id, job_number, customer_id, selected_courier_id, status, job_type
    INTO _job FROM public.jobs WHERE id = _job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job not found'; END IF;

  IF _job.selected_courier_id IS NOT NULL AND _job.selected_courier_id IS DISTINCT FROM _cid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'taken');
  END IF;

  IF _job.status::text NOT IN ('נשלחה לשליחים','ממתינה לתגובות','יש שליחים שאישרו') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'closed');
  END IF;

  UPDATE public.jobs
     SET selected_courier_id = _cid,
         status = 'נבחר שליח'::job_status,
         delivery_status = COALESCE(delivery_status, 'assigned'),
         courier_step = 'שליח אישר',
         accepted_at = COALESCE(accepted_at, now()),
         current_status_updated_at = COALESCE(current_status_updated_at, now()),
         updated_at = now()
   WHERE id = _job_id
     AND selected_courier_id IS NULL
     AND status IN ('נשלחה לשליחים','ממתינה לתגובות','יש שליחים שאישרו');
  GET DIAGNOSTICS _updated = ROW_COUNT;
  IF _updated = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'taken');
  END IF;

  INSERT INTO public.job_outcomes (job_id, courier_id)
  VALUES (_job_id, _cid)
  ON CONFLICT (job_id) DO UPDATE SET courier_id = EXCLUDED.courier_id;

  INSERT INTO public.status_logs (entity_type, entity_id, old_status, new_status, note, changed_by)
  VALUES ('job', _job_id, _job.status::text, 'שליח אישר', _source, auth.uid());

  IF _job.customer_id IS NOT NULL THEN
    PERFORM public.notify_business(
      _job.customer_id, _job_id, 'claim',
      '✅ שליח אישר את ההזמנה',
      'משלוח ' || COALESCE(_job.job_number,'') || ' שובץ לשליח',
      '/business/order/' || _job_id::text
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'job_id', _job_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.courier_respond_offer(_offer_id uuid, _response text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _cid uuid := public.current_active_courier_id();
  _offer record;
  _job record;
  _courier record;
  _link text;
BEGIN
  IF _cid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_active');
  END IF;
  IF _response NOT IN ('accepted','declined') THEN
    RAISE EXCEPTION 'Invalid response: %', _response;
  END IF;

  SELECT * INTO _offer
  FROM public.offer_events
  WHERE id = _offer_id AND courier_id = _cid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;

  SELECT * INTO _job
  FROM public.jobs
  WHERE id = _offer.job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE public.offer_events SET response = 'cancelled', responded_at = now() WHERE id = _offer_id AND response = 'pending';
    RETURN jsonb_build_object('ok', false, 'reason', 'closed');
  END IF;

  IF _response = 'declined' THEN
    UPDATE public.offer_events
       SET response = 'declined', responded_at = now()
     WHERE id = _offer_id AND response = 'pending';
    RETURN jsonb_build_object('ok', true, 'response', 'declined');
  END IF;

  IF COALESCE(_job.pricing_type, 'fixed') = 'quote_request' THEN
    RAISE EXCEPTION 'Job is a quote request';
  END IF;

  IF _job.selected_courier_id IS NOT NULL AND _job.selected_courier_id IS DISTINCT FROM _cid THEN
    UPDATE public.offer_events
       SET response = 'cancelled', responded_at = now()
     WHERE id = _offer_id AND response = 'pending';
    RETURN jsonb_build_object('ok', false, 'reason', 'taken');
  END IF;

  IF _job.status::text NOT IN ('נשלחה לשליחים','ממתינה לתגובות','יש שליחים שאישרו') THEN
    UPDATE public.offer_events
       SET response = 'cancelled', responded_at = now()
     WHERE id = _offer_id AND response = 'pending';
    RETURN jsonb_build_object('ok', false, 'reason', 'closed');
  END IF;

  SELECT id, full_name, whatsapp_phone INTO _courier
  FROM public.couriers
  WHERE id = _cid;

  UPDATE public.jobs
     SET selected_courier_id = _cid,
         status = 'נבחר שליח'::job_status,
         delivery_status = COALESCE(delivery_status, 'assigned'),
         courier_step = 'שליח אישר',
         accepted_at = COALESCE(accepted_at, now()),
         current_status_updated_at = COALESCE(current_status_updated_at, now()),
         updated_at = now()
   WHERE id = _job.id
     AND selected_courier_id IS NULL
     AND status IN ('נשלחה לשליחים','ממתינה לתגובות','יש שליחים שאישרו');

  IF NOT FOUND THEN
    UPDATE public.offer_events
       SET response = 'cancelled', responded_at = now()
     WHERE id = _offer_id AND response = 'pending';
    RETURN jsonb_build_object('ok', false, 'reason', 'taken');
  END IF;

  INSERT INTO public.job_outcomes (job_id, courier_id)
  VALUES (_job.id, _cid)
  ON CONFLICT (job_id) DO UPDATE SET courier_id = EXCLUDED.courier_id;

  UPDATE public.offer_events
     SET response = 'accepted', responded_at = now()
   WHERE id = _offer_id;

  UPDATE public.offer_events
     SET response = 'cancelled', responded_at = COALESCE(responded_at, now())
   WHERE job_id = _job.id
     AND id <> _offer_id
     AND response = 'pending';

  INSERT INTO public.status_logs (entity_type, entity_id, old_status, new_status, note, changed_by)
  VALUES ('job', _job.id, _job.status::text, 'נבחר שליח', 'שליח אישר הצעת עבודה', auth.uid());

  IF _job.customer_id IS NOT NULL THEN
    _link := '/business/track/' || _job.id::text;
    PERFORM public.notify_business(
      _job.customer_id,
      _job.id,
      'courier_selected',
      '✅ שליח אישר את המשלוח',
      'משלוח ' || COALESCE(_job.job_number,'') || ' אושר על ידי ' || COALESCE(_courier.full_name, 'שליח') || '. לחצו למעקב חי.',
      _link
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'response', 'accepted', 'job_id', _job.id, 'courier_id', _cid);
END;
$$;

DROP POLICY IF EXISTS "Couriers claim open jobs" ON public.jobs;
CREATE POLICY "Active couriers claim open jobs"
ON public.jobs
FOR UPDATE
TO authenticated
USING (
  public.current_active_courier_id() IS NOT NULL
  AND selected_courier_id IS NULL
  AND status::text = 'נשלחה לשליחים'
)
WITH CHECK (
  selected_courier_id = public.current_active_courier_id()
  AND status::text IN ('נבחר שליח','פעילה')
);

DROP POLICY IF EXISTS "Couriers read open broadcast jobs" ON public.jobs;
CREATE POLICY "Active couriers read open broadcast jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (
  public.current_active_courier_id() IS NOT NULL
  AND selected_courier_id IS NULL
  AND COALESCE(pricing_type, 'fixed') <> 'quote_request'
  AND status::text = 'נשלחה לשליחים'
);

DROP POLICY IF EXISTS "Couriers read open quote requests" ON public.jobs;
CREATE POLICY "Active couriers read open quote requests"
ON public.jobs
FOR SELECT
TO authenticated
USING (
  public.current_active_courier_id() IS NOT NULL
  AND pricing_type = 'quote_request'
  AND selected_quote_id IS NULL
  AND status::text NOT IN ('בוטלה','הושלמה')
);

ALTER TABLE public.jobs REPLICA IDENTITY FULL;
ALTER TABLE public.offer_events REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'offer_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.offer_events;
  END IF;
END $$;