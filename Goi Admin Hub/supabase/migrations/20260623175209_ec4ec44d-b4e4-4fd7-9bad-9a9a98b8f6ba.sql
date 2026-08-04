CREATE OR REPLACE FUNCTION public.apply_courier_whatsapp_availability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _text text;
  _digits text;
  _suffix text;
  _next boolean;
BEGIN
  IF NEW.type_webhook IS DISTINCT FROM 'incomingMessageReceived' THEN
    RETURN NEW;
  END IF;

  _text := lower(btrim(regexp_replace(coalesce(NEW.button_text, ''), '[✅❌🚀📍📦🛵]', '', 'g')));
  _text := regexp_replace(_text, '\s+', ' ', 'g');

  IF _text IN ('זמין', 'פעיל', 'התחל', 'online', 'on', 'start') THEN
    _next := true;
  ELSIF _text IN ('לא זמין', 'לא פעיל', 'הפסק', 'offline', 'off', 'stop', 'פאוזה', 'pause') THEN
    _next := false;
  ELSE
    RETURN NEW;
  END IF;

  _digits := regexp_replace(coalesce(NEW.sender_phone, ''), '\D', '', 'g');
  _suffix := right(_digits, 9);
  IF _suffix = '' THEN
    RETURN NEW;
  END IF;

  UPDATE public.couriers AS c
     SET accepting_jobs = _next,
         location_sharing_enabled = _next,
         courier_status = CASE
           WHEN c.courier_status::text IN ('ממתין לאישור', 'חסום', 'מושהה')
                OR coalesce(c.is_paused, false) = true
             THEN c.courier_status
           ELSE 'פעיל'::public.courier_status
         END,
         updated_at = now()
   WHERE right(regexp_replace(coalesce(c.whatsapp_phone, ''), '\D', '', 'g'), 9) = _suffix;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_courier_whatsapp_availability ON public.green_api_webhook_events;
CREATE TRIGGER trg_apply_courier_whatsapp_availability
AFTER INSERT ON public.green_api_webhook_events
FOR EACH ROW
EXECUTE FUNCTION public.apply_courier_whatsapp_availability();