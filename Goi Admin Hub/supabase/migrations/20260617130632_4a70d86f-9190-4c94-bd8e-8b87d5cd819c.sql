CREATE OR REPLACE FUNCTION public.courier_claim_job(_job_id uuid, _source text DEFAULT 'app')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _cid uuid := public.current_courier_id();
  _job record;
  _courier record;
  _link text;
BEGIN
  IF _cid IS NULL THEN
    RAISE EXCEPTION 'Not a courier';
  END IF;

  SELECT * INTO _job
  FROM public.jobs
  WHERE id = _job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found';
  END IF;

  IF COALESCE(_job.pricing_type, 'fixed') = 'quote_request' THEN
    RAISE EXCEPTION 'Job is a quote request';
  END IF;

  IF _job.selected_courier_id IS NOT NULL AND _job.selected_courier_id IS DISTINCT FROM _cid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'taken');
  END IF;

  IF _job.status::text IN ('בוטלה','הושלמה') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'closed');
  END IF;

  SELECT id, full_name, whatsapp_phone INTO _courier
  FROM public.couriers
  WHERE id = _cid;

  UPDATE public.jobs
     SET selected_courier_id = _cid,
         status = 'נבחר שליח'::job_status,
         updated_at = now()
   WHERE id = _job_id;

  INSERT INTO public.job_outcomes (job_id, courier_id)
  VALUES (_job_id, _cid)
  ON CONFLICT (job_id) DO UPDATE SET courier_id = EXCLUDED.courier_id;

  UPDATE public.offer_events
     SET response = 'accepted', responded_at = COALESCE(responded_at, now())
   WHERE job_id = _job_id AND courier_id = _cid;

  UPDATE public.offer_events
     SET response = 'cancelled', responded_at = COALESCE(responded_at, now())
   WHERE job_id = _job_id
     AND courier_id <> _cid
     AND response = 'pending';

  INSERT INTO public.status_logs (entity_type, entity_id, old_status, new_status, note, changed_by)
  VALUES ('job', _job_id, _job.status::text, 'נבחר שליח', 'שליח לקח את המשלוח דרך ' || COALESCE(_source, 'app'), auth.uid());

  IF _job.customer_id IS NOT NULL THEN
    _link := '/business/track/' || _job_id::text;
    PERFORM public.notify_business(
      _job.customer_id,
      _job_id,
      'courier_selected',
      '✅ שליח לקח את המשלוח',
      'משלוח ' || COALESCE(_job.job_number,'') || ' נלקח על ידי ' || COALESCE(_courier.full_name, 'שליח') || '. לחצו למעקב חי.',
      _link
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'job_id', _job_id, 'courier_id', _cid);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.courier_claim_job(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.courier_claim_job(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.courier_respond_offer(_offer_id uuid, _response text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _cid uuid := public.current_courier_id();
  _offer record;
  _job record;
  _courier record;
  _link text;
BEGIN
  IF _cid IS NULL THEN
    RAISE EXCEPTION 'Not a courier';
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

  IF _response = 'declined' THEN
    UPDATE public.offer_events
       SET response = 'declined', responded_at = now()
     WHERE id = _offer_id;
    RETURN jsonb_build_object('ok', true, 'response', 'declined');
  END IF;

  SELECT * INTO _job
  FROM public.jobs
  WHERE id = _offer.job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found';
  END IF;

  IF COALESCE(_job.pricing_type, 'fixed') = 'quote_request' THEN
    RAISE EXCEPTION 'Job is a quote request';
  END IF;

  IF _job.selected_courier_id IS NOT NULL AND _job.selected_courier_id IS DISTINCT FROM _cid THEN
    UPDATE public.offer_events
       SET response = 'cancelled', responded_at = now()
     WHERE id = _offer_id;
    RETURN jsonb_build_object('ok', false, 'reason', 'taken');
  END IF;

  IF _job.status::text IN ('בוטלה','הושלמה') THEN
    UPDATE public.offer_events
       SET response = 'cancelled', responded_at = now()
     WHERE id = _offer_id;
    RETURN jsonb_build_object('ok', false, 'reason', 'closed');
  END IF;

  SELECT id, full_name, whatsapp_phone INTO _courier
  FROM public.couriers
  WHERE id = _cid;

  UPDATE public.jobs
     SET selected_courier_id = _cid,
         status = 'נבחר שליח'::job_status,
         updated_at = now()
   WHERE id = _job.id;

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

REVOKE EXECUTE ON FUNCTION public.courier_respond_offer(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.courier_respond_offer(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.courier_update_job_progress(_job_id uuid, _step text, _note text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _cid UUID := public.current_courier_id();
  _job RECORD;
  _title TEXT;
  _body TEXT;
  _link TEXT;
  _new_job_status TEXT;
BEGIN
  IF _cid IS NULL THEN
    RAISE EXCEPTION 'Not a courier';
  END IF;

  SELECT id, job_number, customer_id, selected_courier_id, status
    INTO _job FROM public.jobs WHERE id = _job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job not found'; END IF;
  IF _job.selected_courier_id IS DISTINCT FROM _cid THEN
    RAISE EXCEPTION 'Not your job';
  END IF;

  IF _step NOT IN ('בדרך לאיסוף','הגעתי לאיסוף','אספתי','נאסף','בדרך למסירה','נמסר','הושלם') THEN
    RAISE EXCEPTION 'Invalid step: %', _step;
  END IF;

  IF _step = 'נאסף' THEN
    _step := 'אספתי';
  END IF;

  INSERT INTO public.job_outcomes (job_id, courier_id)
  VALUES (_job_id, _cid)
  ON CONFLICT (job_id) DO UPDATE SET courier_id = EXCLUDED.courier_id;

  _new_job_status := CASE WHEN _step IN ('נמסר','הושלם') THEN 'הושלמה' ELSE 'פעילה' END;

  UPDATE public.jobs
     SET status = _new_job_status::job_status,
         updated_at = now()
   WHERE id = _job_id;

  IF _step IN ('אספתי','בדרך למסירה','נמסר','הושלם') THEN
    UPDATE public.job_outcomes
       SET picked_up_at = COALESCE(picked_up_at, now())
     WHERE job_id = _job_id;
  END IF;

  IF _step IN ('נמסר','הושלם') THEN
    UPDATE public.job_outcomes
       SET delivered_at = COALESCE(delivered_at, now())
     WHERE job_id = _job_id;
  END IF;

  INSERT INTO public.status_logs (entity_type, entity_id, old_status, new_status, note, changed_by)
  VALUES ('job', _job_id, _job.status::text, _step, _note, auth.uid());

  IF _job.customer_id IS NOT NULL THEN
    _link := '/business/track/' || _job_id::text;
    _title := CASE _step
      WHEN 'בדרך לאיסוף' THEN '🚚 השליח בדרך לאיסוף'
      WHEN 'הגעתי לאיסוף' THEN '📍 השליח הגיע לנקודת האיסוף'
      WHEN 'אספתי' THEN '📦 ההזמנה נאספה'
      WHEN 'בדרך למסירה' THEN '🛵 השליח בדרך למסירה'
      WHEN 'נמסר' THEN '✅ ההזמנה נמסרה'
      WHEN 'הושלם' THEN '🎉 המשלוח הושלם'
    END;
    _body := 'משלוח ' || COALESCE(_job.job_number,'') || ' — לחצו לעקוב אחרי השליח במפה';
    PERFORM public.notify_business(_job.customer_id, _job_id, 'progress', _title, _body, _link);
  END IF;

  RETURN jsonb_build_object('ok', true, 'step', _step, 'status', _new_job_status);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.courier_update_job_progress(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.courier_update_job_progress(UUID, TEXT, TEXT) TO authenticated;