
CREATE OR REPLACE FUNCTION public.transition_delivery_status(_job_id uuid, _courier_id uuid, _requested_status text, _action_source text DEFAULT 'whatsapp'::text, _external_message_id text DEFAULT NULL::text, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _job RECORD;
  _current text;
  _allowed boolean := false;
  _he_step text;
  _job_status text;
BEGIN
  SELECT * INTO _job FROM public.jobs WHERE id = _job_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF _job.selected_courier_id IS DISTINCT FROM _courier_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_assigned');
  END IF;

  _current := COALESCE(_job.delivery_status, 'assigned');

  IF _current = _requested_status THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true, 'status', _current);
  END IF;

  -- Simplified 3-step flow: assigned → heading_to_pickup → picked_up → delivered.
  -- Old 6-step transitions still allowed for backward compat.
  _allowed := (
    (_current = 'assigned'             AND _requested_status IN ('heading_to_pickup','picked_up','delivered')) OR
    (_current = 'heading_to_pickup'    AND _requested_status IN ('arrived_at_pickup','picked_up','delivered')) OR
    (_current = 'arrived_at_pickup'    AND _requested_status IN ('picked_up','delivered')) OR
    (_current = 'picked_up'            AND _requested_status IN ('heading_to_dropoff','arrived_at_dropoff','delivered')) OR
    (_current = 'heading_to_dropoff'   AND _requested_status IN ('arrived_at_dropoff','delivered')) OR
    (_current = 'arrived_at_dropoff'   AND _requested_status = 'delivered')
  );

  IF NOT _allowed THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_transition', 'current', _current);
  END IF;

  _he_step := CASE _requested_status
    WHEN 'heading_to_pickup'   THEN 'בדרך לאיסוף'
    WHEN 'arrived_at_pickup'   THEN 'הגעתי לאיסוף'
    WHEN 'picked_up'           THEN 'אספתי'
    WHEN 'heading_to_dropoff'  THEN 'בדרך למסירה'
    WHEN 'arrived_at_dropoff'  THEN 'הגעתי ללקוח'
    WHEN 'delivered'           THEN 'נמסר'
  END;
  _job_status := CASE WHEN _requested_status = 'delivered' THEN 'הושלמה' ELSE 'פעילה' END;

  UPDATE public.jobs
     SET delivery_status = _requested_status,
         current_status_updated_at = now(),
         courier_step = _he_step,
         status = _job_status::job_status,
         heading_to_pickup_at  = CASE WHEN _requested_status = 'heading_to_pickup'  THEN now() ELSE heading_to_pickup_at  END,
         arrived_at_pickup_at  = CASE WHEN _requested_status = 'arrived_at_pickup'  THEN now() ELSE arrived_at_pickup_at  END,
         picked_up_at          = CASE WHEN _requested_status = 'picked_up'          THEN now() ELSE picked_up_at          END,
         heading_to_dropoff_at = CASE WHEN _requested_status = 'heading_to_dropoff' THEN now() ELSE heading_to_dropoff_at END,
         arrived_at_dropoff_at = CASE WHEN _requested_status = 'arrived_at_dropoff' THEN now() ELSE arrived_at_dropoff_at END,
         delivered_at          = CASE WHEN _requested_status = 'delivered'          THEN now() ELSE delivered_at          END,
         updated_at = now()
   WHERE id = _job_id;

  INSERT INTO public.job_outcomes (job_id, courier_id) VALUES (_job_id, _courier_id)
    ON CONFLICT (job_id) DO UPDATE SET courier_id = EXCLUDED.courier_id;
  IF _requested_status = 'picked_up' THEN
    UPDATE public.job_outcomes SET picked_up_at = COALESCE(picked_up_at, now()) WHERE job_id = _job_id;
  ELSIF _requested_status = 'delivered' THEN
    UPDATE public.job_outcomes SET delivered_at = COALESCE(delivered_at, now()), picked_up_at = COALESCE(picked_up_at, now()) WHERE job_id = _job_id;
  END IF;

  INSERT INTO public.delivery_status_history(
    job_id, courier_id, previous_status, new_status, action_source, external_message_id, metadata
  ) VALUES (_job_id, _courier_id, _current, _requested_status, COALESCE(_action_source,'system'), _external_message_id, COALESCE(_metadata,'{}'::jsonb));

  IF _job.customer_id IS NOT NULL THEN
    PERFORM public.notify_business(
      _job.customer_id, _job_id, 'progress',
      CASE _requested_status
        WHEN 'heading_to_pickup'  THEN '🚚 השליח יצא לאיסוף'
        WHEN 'arrived_at_pickup'  THEN '📍 השליח הגיע לאיסוף'
        WHEN 'picked_up'          THEN '📦 המשלוח נאסף'
        WHEN 'heading_to_dropoff' THEN '🛵 השליח בדרך ללקוח'
        WHEN 'arrived_at_dropoff' THEN '📍 השליח הגיע ללקוח'
        WHEN 'delivered'          THEN '✅ המשלוח נמסר'
      END,
      'משלוח ' || COALESCE(_job.job_number,'') || ' עודכן',
      '/business/track/' || _job_id::text
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', _requested_status, 'previous', _current);
END $function$;
