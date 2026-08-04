REVOKE ALL ON FUNCTION public.apply_courier_whatsapp_availability() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_courier_whatsapp_availability() FROM anon;
REVOKE ALL ON FUNCTION public.apply_courier_whatsapp_availability() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_courier_whatsapp_availability() TO service_role;