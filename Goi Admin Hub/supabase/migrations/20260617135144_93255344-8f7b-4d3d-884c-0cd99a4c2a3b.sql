
-- Add courier_step text column on jobs to mirror the latest courier progress step
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS courier_step TEXT;

-- Update RPC to also write courier_step on every progress update
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

  IF _step = 'נאסף' THEN _step := 'אספתי'; END IF;
  IF _step = 'הושלם' THEN _step := 'נמסר'; END IF;

  INSERT INTO public.job_outcomes (job_id, courier_id)
  VALUES (_job_id, _cid)
  ON CONFLICT (job_id) DO UPDATE SET courier_id = EXCLUDED.courier_id;

  _new_job_status := CASE WHEN _step = 'נמסר' THEN 'הושלמה' ELSE 'פעילה' END;

  UPDATE public.jobs
     SET status = _new_job_status::job_status,
         courier_step = _step,
         updated_at = now()
   WHERE id = _job_id;

  IF _step IN ('אספתי','בדרך למסירה','נמסר') THEN
    UPDATE public.job_outcomes
       SET picked_up_at = COALESCE(picked_up_at, now())
     WHERE job_id = _job_id;
  END IF;

  IF _step = 'נמסר' THEN
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
    END;
    _body := 'משלוח ' || COALESCE(_job.job_number,'') || ' — לחצו לעקוב אחרי השליח במפה';
    PERFORM public.notify_business(_job.customer_id, _job_id, 'progress', _title, _body, _link);
  END IF;

  RETURN jsonb_build_object('ok', true, 'step', _step, 'status', _new_job_status);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.courier_update_job_progress(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.courier_update_job_progress(UUID, TEXT, TEXT) TO authenticated;

-- Also update courier_claim_job to set courier_step = 'נבחר שליח' so business panel shows it
CREATE OR REPLACE FUNCTION public.courier_claim_job(_job_id uuid, _source text DEFAULT 'app')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _cid UUID := public.current_courier_id();
  _job RECORD;
  _updated INT;
BEGIN
  IF _cid IS NULL THEN RAISE EXCEPTION 'Not a courier'; END IF;

  SELECT id, job_number, customer_id, selected_courier_id, status, job_type
    INTO _job FROM public.jobs WHERE id = _job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job not found'; END IF;

  IF _job.selected_courier_id IS NOT NULL AND _job.selected_courier_id IS DISTINCT FROM _cid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'taken');
  END IF;

  UPDATE public.jobs
     SET selected_courier_id = _cid,
         status = 'נבחר שליח'::job_status,
         courier_step = 'שליח אישר',
         updated_at = now()
   WHERE id = _job_id
     AND (selected_courier_id IS NULL OR selected_courier_id = _cid)
     AND status IN ('נשלחה לשליחים','ממתינה לתגובות','יש שליחים שאישרו','נבחר שליח');
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

REVOKE EXECUTE ON FUNCTION public.courier_claim_job(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.courier_claim_job(UUID, TEXT) TO authenticated;
