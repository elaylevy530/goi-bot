-- Extend pilot-area validation to UPDATE as well, so admins can't be bypassed
-- by creating in-pilot then editing pickup_area to outside the pilot.

CREATE OR REPLACE FUNCTION public.tg_validate_pilot_area()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Explicit override flag bypasses (set only via admin tooling)
  IF COALESCE(NEW.pilot_area_override, false) THEN RETURN NEW; END IF;
  -- Admins can always change
  IF public.is_admin() THEN RETURN NEW; END IF;

  -- On UPDATE, only re-validate if pickup_area actually changed
  IF TG_OP = 'UPDATE' AND NEW.pickup_area IS NOT DISTINCT FROM OLD.pickup_area THEN
    RETURN NEW;
  END IF;

  IF NEW.pickup_area IS NULL THEN RETURN NEW; END IF;

  IF NOT public.is_pilot_area(NEW.pickup_area) THEN
    RAISE EXCEPTION 'Goi פועלת כעת רק באזורים הפעילים בפיילוט. כתובת האיסוף (%) מחוץ לאזור המורשה.', NEW.pickup_area
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_pilot_area ON public.jobs;
CREATE TRIGGER trg_validate_pilot_area
  BEFORE INSERT OR UPDATE OF pickup_area, pilot_area_override ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.tg_validate_pilot_area();