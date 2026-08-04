CREATE OR REPLACE FUNCTION public.is_pilot_area(_city TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT true;
$$;

COMMENT ON FUNCTION public.is_pilot_area(TEXT) IS 'Legacy compatibility only: regional launch restrictions are disabled and all areas are allowed.';