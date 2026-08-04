CREATE OR REPLACE FUNCTION public.courier_update_job_progress_as_bot(_job_id uuid, _courier_id uuid, _step text, _note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _job RECORD;
  _title TEXT;
  _body TEXT;
  _link TEXT;
  _new_job_status TEXT;
BEGIN
  SELECT id, job_number, customer_id, selected_courier_id, status
    INTO _job FROM public.jobs WHERE id = _job_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF _job.selected_courier_id IS DISTINCT FROM _courier_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_your_job');
  END IF;

  IF _step NOT IN ('בדרך לאיסוף','הגעתי לאיסוף','אספתי','נאסף','בדרך למסירה','נמסר','הושלם') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_step');
  END IF;

  IF _step = 'נאסף' THEN _step := 'אספתי'; END IF;
  IF _step = 'הושלם' THEN _step := 'נמסר'; END IF;

  INSERT INTO public.job_outcomes (job_id, courier_id)
  VALUES (_job_id, _courier_id)
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
  VALUES ('job', _job_id, _job.status::text, _step, COALESCE(_note, 'עודכן דרך WhatsApp'), NULL);

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
$function$;

GRANT EXECUTE ON FUNCTION public.courier_update_job_progress_as_bot(uuid, uuid, text, text) TO service_role;