DROP TRIGGER IF EXISTS validate_pilot_area_trigger ON public.jobs;
DROP TRIGGER IF EXISTS tg_validate_pilot_area ON public.jobs;
DROP TRIGGER IF EXISTS trg_validate_pilot_area ON public.jobs;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'public.jobs'::regclass
      AND NOT tgisinternal
      AND (
        tgname ILIKE '%pilot%'
        OR tgfoid = 'public.tg_validate_pilot_area'::regproc
      )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.jobs', r.tgname);
  END LOOP;
END$$;

DROP FUNCTION IF EXISTS public.tg_validate_pilot_area();

CREATE OR REPLACE FUNCTION public.is_pilot_area(_city TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT true;
$$;

COMMENT ON FUNCTION public.is_pilot_area(TEXT) IS 'Legacy compatibility only: regional launch restrictions are disabled and all areas are allowed.';