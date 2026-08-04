CREATE OR REPLACE FUNCTION public.courier_update_job_progress(_job_id uuid, _step text, _note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _cid UUID := public.current_courier_id();
  _job RECORD;
  _title TEXT;
  _body TEXT;
  _link TEXT;
BEGIN
  IF _cid IS NULL THEN
    RAISE EXCEPTION 'Not a courier';
  END IF;

  SELECT id, job_number, customer_id, selected_courier_id, status
    INTO _job FROM public.jobs WHERE id = _job_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job not found'; END IF;
  IF _job.selected_courier_id IS DISTINCT FROM _cid THEN
    RAISE EXCEPTION 'Not your job';
  END IF;

  IF _step NOT IN ('בדרך לאיסוף','הגעתי לאיסוף','אספתי','בדרך למסירה','נמסר','הושלם') THEN
    RAISE EXCEPTION 'Invalid step: %', _step;
  END IF;

  INSERT INTO public.job_outcomes (job_id, courier_id)
  VALUES (_job_id, _cid)
  ON CONFLICT (job_id) DO NOTHING;

  -- Advance jobs.status when courier actually starts moving
  IF _step IN ('בדרך לאיסוף','הגעתי לאיסוף','אספתי','בדרך למסירה')
     AND _job.status::text IN ('נבחר שליח') THEN
    UPDATE public.jobs SET status = 'פעילה'::job_status, updated_at = now()
      WHERE id = _job_id;
  END IF;

  IF _step = 'אספתי' THEN
    UPDATE public.job_outcomes SET picked_up_at = COALESCE(picked_up_at, now())
      WHERE job_id = _job_id;
  ELSIF _step = 'נמסר' OR _step = 'הושלם' THEN
    UPDATE public.job_outcomes SET delivered_at = COALESCE(delivered_at, now())
      WHERE job_id = _job_id;
    IF _step = 'הושלם' THEN
      UPDATE public.jobs SET status = 'הושלמה'::job_status, updated_at = now()
        WHERE id = _job_id;
    END IF;
  END IF;

  INSERT INTO public.status_logs (entity_type, entity_id, old_status, new_status, note, changed_by)
  VALUES ('job', _job_id, _job.status::text, _step, _note, auth.uid());

  -- Notify the business in real-time on every step
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

  RETURN jsonb_build_object('ok', true, 'step', _step);
END;
$function$;