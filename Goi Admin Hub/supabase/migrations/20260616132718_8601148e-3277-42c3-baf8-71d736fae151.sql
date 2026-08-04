
-- RPC to complete signup: create courier/business profile + user role
CREATE OR REPLACE FUNCTION public.complete_signup_profile(
  _role TEXT,
  _full_name TEXT,
  _phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    -- Check if courier already exists for this phone — link it
    SELECT id INTO _new_id FROM public.couriers WHERE whatsapp_phone = _phone LIMIT 1;
    IF _new_id IS NOT NULL THEN
      UPDATE public.couriers SET user_id = _uid WHERE id = _new_id AND user_id IS NULL;
    ELSE
      INSERT INTO public.couriers (user_id, full_name, whatsapp_phone, courier_status)
      VALUES (_uid, COALESCE(NULLIF(_full_name,''), _phone), _phone, 'חסר פרטים')
      RETURNING id INTO _new_id;
    END IF;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'courier'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    SELECT id INTO _new_id FROM public.customers WHERE phone = _phone LIMIT 1;
    IF _new_id IS NOT NULL THEN
      UPDATE public.customers SET user_id = _uid WHERE id = _new_id AND user_id IS NULL;
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
$$;

REVOKE EXECUTE ON FUNCTION public.complete_signup_profile(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_signup_profile(TEXT, TEXT, TEXT) TO authenticated;
