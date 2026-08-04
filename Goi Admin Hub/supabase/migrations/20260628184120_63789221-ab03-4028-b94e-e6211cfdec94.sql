
-- Load & pace + smart engine columns
ALTER TABLE public.couriers
  ADD COLUMN IF NOT EXISTS max_concurrent_jobs INT NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS pause_until TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS auto_pause_after_declines INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consecutive_declines INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quiet_hours_start TEXT NULL,
  ADD COLUMN IF NOT EXISTS quiet_hours_end TEXT NULL,
  ADD COLUMN IF NOT EXISTS offers_sent_total INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS offers_accepted_total INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS acceptance_rate NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS insurance_expires_at DATE NULL,
  ADD COLUMN IF NOT EXISTS license_expires_at DATE NULL;

-- Trigger: on offer_events update, track declines/accepts + auto-pause
CREATE OR REPLACE FUNCTION public.offer_events_update_courier_stats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_max INT;
BEGIN
  -- Only react when response transitions (NULL -> value, or changes)
  IF NEW.response IS DISTINCT FROM OLD.response AND NEW.response IS NOT NULL THEN
    IF NEW.response::text = 'accepted' THEN
      UPDATE public.couriers
        SET offers_accepted_total = offers_accepted_total + 1,
            consecutive_declines  = 0,
            acceptance_rate = ROUND(
              (offers_accepted_total + 1)::numeric
              / GREATEST(offers_sent_total, 1)::numeric, 3),
            updated_at = now()
        WHERE id = NEW.courier_id;
    ELSIF NEW.response::text IN ('declined','expired','timeout','ignored') THEN
      UPDATE public.couriers
        SET consecutive_declines = consecutive_declines + 1,
            acceptance_rate = ROUND(
              offers_accepted_total::numeric
              / GREATEST(offers_sent_total, 1)::numeric, 3),
            updated_at = now()
        WHERE id = NEW.courier_id
        RETURNING auto_pause_after_declines INTO v_max;
      -- Auto-pause cooldown 30min after N consecutive misses
      IF v_max IS NOT NULL AND v_max > 0 THEN
        UPDATE public.couriers
          SET pause_until = now() + interval '30 minutes',
              consecutive_declines = 0
          WHERE id = NEW.courier_id
            AND consecutive_declines >= v_max
            AND (pause_until IS NULL OR pause_until < now());
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_offer_events_courier_stats ON public.offer_events;
CREATE TRIGGER trg_offer_events_courier_stats
  AFTER UPDATE ON public.offer_events
  FOR EACH ROW EXECUTE FUNCTION public.offer_events_update_courier_stats();

-- Trigger: bump offers_sent_total on INSERT
CREATE OR REPLACE FUNCTION public.offer_events_bump_sent()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.couriers
    SET offers_sent_total = offers_sent_total + 1,
        acceptance_rate = ROUND(
          offers_accepted_total::numeric
          / GREATEST(offers_sent_total + 1, 1)::numeric, 3),
        updated_at = now()
    WHERE id = NEW.courier_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_offer_events_bump_sent ON public.offer_events;
CREATE TRIGGER trg_offer_events_bump_sent
  AFTER INSERT ON public.offer_events
  FOR EACH ROW EXECUTE FUNCTION public.offer_events_bump_sent();
