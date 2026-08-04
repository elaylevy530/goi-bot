CREATE OR REPLACE FUNCTION public.courier_claim_job_as_bot(_job_id uuid, _courier_id uuid, _source text DEFAULT 'whatsapp')
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
  SELECT * INTO _job
  FROM public.jobs
  WHERE id = _job_id
  FOR UPDATE;

  IF NOT FOUND THEN
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

  IF _job.status::text IN ('בוטלה','הושלמה') THEN
    UPDATE public.offer_events
       SET response = 'cancelled', responded_at = COALESCE(responded_at, now())
     WHERE job_id = _job_id AND courier_id = _courier_id AND response = 'pending';
    RETURN jsonb_build_object('ok', false, 'reason', 'closed');
  END IF;

  SELECT id, full_name, whatsapp_phone INTO _courier
  FROM public.couriers
  WHERE id = _courier_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'courier_not_found');
  END IF;

  UPDATE public.jobs
     SET selected_courier_id = _courier_id,
         status = 'נבחר שליח'::job_status,
         updated_at = now()
   WHERE id = _job_id;

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

REVOKE EXECUTE ON FUNCTION public.courier_claim_job_as_bot(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.courier_claim_job_as_bot(uuid, uuid, text) TO service_role;