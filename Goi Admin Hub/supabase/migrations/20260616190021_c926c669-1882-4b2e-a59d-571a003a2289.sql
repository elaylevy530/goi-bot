CREATE OR REPLACE FUNCTION public.complete_signup_profile(_role text, _full_name text, _phone text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
            courier_status = CASE WHEN courier_status = 'פעיל' THEN courier_status ELSE 'ממתין לאישור' END
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
$function$;

-- Move existing self-registered couriers from 'חסר פרטים' to 'ממתין לאישור'
UPDATE public.couriers
   SET courier_status = 'ממתין לאישור'
 WHERE courier_status = 'חסר פרטים'
   AND user_id IS NOT NULL;