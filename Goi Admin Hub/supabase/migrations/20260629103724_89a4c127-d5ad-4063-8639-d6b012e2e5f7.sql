CREATE OR REPLACE FUNCTION public.open_conversation(_kind text, _courier_id uuid DEFAULT NULL::uuid, _business_id uuid DEFAULT NULL::uuid, _job_id uuid DEFAULT NULL::uuid, _subject text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _cid uuid;
  _bid uuid;
  _id uuid;
  _is_admin boolean;
  _viewer_courier uuid;
  _viewer_business uuid;
BEGIN
  _is_admin := public.has_role(auth.uid(),'admin');
  _viewer_courier := public.current_courier_id();
  _viewer_business := public.current_business_id();

  IF _kind = 'courier_support' THEN
    _cid := COALESCE(_viewer_courier, CASE WHEN _is_admin THEN _courier_id END);
    IF _cid IS NULL THEN RAISE EXCEPTION 'courier_id required'; END IF;
    SELECT id INTO _id FROM public.conversations WHERE kind='courier_support' AND courier_id=_cid;
    IF _id IS NULL THEN
      INSERT INTO public.conversations(kind, courier_id, subject) VALUES ('courier_support', _cid, COALESCE(_subject,'תמיכה'))
      RETURNING id INTO _id;
    END IF;
  ELSIF _kind = 'business_support' THEN
    _bid := COALESCE(_viewer_business, CASE WHEN _is_admin THEN _business_id END);
    IF _bid IS NULL THEN RAISE EXCEPTION 'business_id required'; END IF;
    SELECT id INTO _id FROM public.conversations WHERE kind='business_support' AND business_id=_bid;
    IF _id IS NULL THEN
      INSERT INTO public.conversations(kind, business_id, subject) VALUES ('business_support', _bid, COALESCE(_subject,'תמיכה'))
      RETURNING id INTO _id;
    END IF;
  ELSIF _kind = 'courier_business' THEN
    -- For shared courier<->business threads, accept ids from args and validate caller is a participant
    _cid := _courier_id;
    _bid := _business_id;
    IF _job_id IS NULL THEN RAISE EXCEPTION 'job_id required'; END IF;
    -- Derive missing ids from the job itself
    IF _cid IS NULL OR _bid IS NULL THEN
      SELECT COALESCE(_cid, selected_courier_id), COALESCE(_bid, customer_id)
        INTO _cid, _bid
        FROM public.jobs WHERE id = _job_id;
    END IF;
    IF _cid IS NULL OR _bid IS NULL THEN RAISE EXCEPTION 'courier_id and business_id required'; END IF;
    IF NOT _is_admin AND _viewer_courier IS DISTINCT FROM _cid AND _viewer_business IS DISTINCT FROM _bid THEN
      RAISE EXCEPTION 'not a participant';
    END IF;
    SELECT id INTO _id FROM public.conversations
      WHERE kind='courier_business' AND courier_id=_cid AND business_id=_bid AND job_id=_job_id;
    IF _id IS NULL THEN
      INSERT INTO public.conversations(kind, courier_id, business_id, job_id, subject)
      VALUES ('courier_business', _cid, _bid, _job_id, COALESCE(_subject,'משלוח'))
      RETURNING id INTO _id;
    END IF;
  ELSE
    RAISE EXCEPTION 'invalid kind: %', _kind;
  END IF;

  RETURN _id;
END $function$;