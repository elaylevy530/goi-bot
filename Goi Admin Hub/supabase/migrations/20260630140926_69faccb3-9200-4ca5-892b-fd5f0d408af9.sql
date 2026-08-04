DROP TRIGGER IF EXISTS validate_pilot_area_trigger ON public.jobs;
DROP TRIGGER IF EXISTS tg_validate_pilot_area ON public.jobs;
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tgname FROM pg_trigger
    WHERE tgrelid = 'public.jobs'::regclass
      AND NOT tgisinternal
      AND tgfoid = 'public.tg_validate_pilot_area'::regproc
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.jobs', r.tgname);
  END LOOP;
END$$;