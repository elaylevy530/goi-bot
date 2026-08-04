CREATE OR REPLACE FUNCTION public.courier_claim_job_as_bot(_job_id uuid, _courier_id uuid, _source text DEFAULT 'whatsapp'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _job record;
  _courier record;
  _link text;
BEGIN
  SELECT id, full_name, whatsapp_phone, courier_status, is_paused INTO _courier
  FROM public.couriers
  WHERE id = _courier_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'courier_not_found');
  END IF;

  IF _courier.courier_status::text <> 'פעיל' OR COALESCE(_courier.is_paused, false) = true THEN
    UPDATE public.offer_events
       SET response = 'cancelled', responded_at = COALESCE(responded_at, now())
     WHERE job_id = _job_id AND courier_id = _courier_id AND response = 'pending';
    RETURN jsonb_build_object('ok', false, 'reason', 'not_active');
  END IF;

  SELECT * INTO _job
  FROM public.jobs
  WHERE id = _job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE public.offer_events
       SET response = 'cancelled', responded_at = COALESCE(responded_at, now())
     WHERE job_id = _job_id AND courier_id = _courier_id AND response = 'pending';
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF COALESCE(_job.pricing_type, 'fixed') = 'quote_request' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'quote_request');
  END IF;

  IF _job.selected_courier_id IS NOT NULL AND _job.selected_courier_id IS DISTINCT FROM _courier_id THEN
    UPDATE public.offer_events
       SET response = 'cancelled', responded_at = COALESCE(responded_at, now())
     WHERE job_id = _job_id AND courier_id = _courier_id AND response = 'pending';
    RETURN jsonb_build_object('ok', false, 'reason', 'taken');
  END IF;

  IF _job.status::text NOT IN ('נשלחה לשליחים','ממתינה לתגובות','יש שליחים שאישרו') THEN
    UPDATE public.offer_events
       SET response = 'cancelled', responded_at = COALESCE(responded_at, now())
     WHERE job_id = _job_id AND courier_id = _courier_id AND response = 'pending';
    RETURN jsonb_build_object('ok', false, 'reason', 'closed');
  END IF;

  UPDATE public.jobs
     SET selected_courier_id = _courier_id,
         status = 'נבחר שליח'::job_status,
         delivery_status = 'assigned',
         courier_step = 'שליח אישר',
         accepted_at = COALESCE(accepted_at, now()),
         current_status_updated_at = now(),
         updated_at = now()
   WHERE id = _job_id
     AND selected_courier_id IS NULL
     AND status IN ('נשלחה לשליחים','ממתינה לתגובות','יש שליחים שאישרו');

  IF NOT FOUND THEN
    UPDATE public.offer_events
       SET response = 'cancelled', responded_at = COALESCE(responded_at, now())
     WHERE job_id = _job_id AND courier_id = _courier_id AND response = 'pending';
    RETURN jsonb_build_object('ok', false, 'reason', 'taken');
  END IF;

  INSERT INTO public.job_outcomes (job_id, courier_id)
  VALUES (_job_id, _courier_id)
  ON CONFLICT (job_id) DO UPDATE SET courier_id = EXCLUDED.courier_id;

  UPDATE public.offer_events
     SET response = 'accepted', responded_at = COALESCE(responded_at, now())
   WHERE job_id = _job_id AND courier_id = _courier_id;

  UPDATE public.offer_events
     SET response = 'cancelled', responded_at = COALESCE(responded_at, now())
   WHERE job_id = _job_id
     AND courier_id <> _courier_id
     AND response = 'pending';

  INSERT INTO public.status_logs (entity_type, entity_id, old_status, new_status, note, changed_by)
  VALUES ('job', _job_id, _job.status::text, 'נבחר שליח', 'שליח לקח את המשלוח דרך ' || COALESCE(_source, 'whatsapp'), NULL);

  INSERT INTO public.delivery_status_history(
    job_id, courier_id, previous_status, new_status, action_source, external_message_id, metadata
  ) VALUES (_job_id, _courier_id, COALESCE(_job.delivery_status, 'open'), 'assigned', COALESCE(_source, 'whatsapp'), NULL, '{}'::jsonb);

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

  RETURN jsonb_build_object('ok', true, 'job_id', _job_id, 'courier_id', _courier_id);
END;
$$;

DROP POLICY IF EXISTS "Active couriers read open quote requests" ON public.jobs;
CREATE POLICY "Active couriers read open quote requests"
ON public.jobs
FOR SELECT
TO authenticated
USING (
  public.current_active_courier_id() IS NOT NULL
  AND pricing_type = 'quote_request'
  AND selected_quote_id IS NULL
  AND status::text IN ('נשלחה לשליחים','ממתינה לתגובות','יש שליחים שאישרו')
);

REVOKE EXECUTE ON FUNCTION public.current_active_courier_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_active_courier_id() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.courier_claim_job(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.courier_claim_job(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.courier_respond_offer(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.courier_respond_offer(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.complete_signup_profile(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_signup_profile(text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.courier_claim_job_as_bot(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.courier_claim_job_as_bot(uuid, uuid, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.tg_guard_courier_self_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_guard_courier_self_status() TO service_role;

REVOKE EXECUTE ON FUNCTION public.tg_update_offers_on_job_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_update_offers_on_job_change() TO service_role;