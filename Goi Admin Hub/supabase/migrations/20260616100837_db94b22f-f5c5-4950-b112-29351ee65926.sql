
CREATE OR REPLACE FUNCTION public.recompute_courier_stats(_courier_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o_total int := 0;
  o_accepted int := 0;
  o_declined int := 0;
  o_noresp int := 0;
  acc_rate numeric := 0;
  j_done int := 0;
  j_cancel int := 0;
  on_time numeric := 0;
  rating numeric := NULL;
  resp_secs int := NULL;
  last_act timestamptz := NULL;
BEGIN
  SELECT
    count(*),
    count(*) FILTER (WHERE response = 'accepted'),
    count(*) FILTER (WHERE response = 'declined'),
    count(*) FILTER (WHERE response IN ('no_response','expired')),
    (avg(EXTRACT(EPOCH FROM (responded_at - sent_at))) FILTER (WHERE responded_at IS NOT NULL))::int,
    max(GREATEST(sent_at, responded_at))
  INTO o_total, o_accepted, o_declined, o_noresp, resp_secs, last_act
  FROM public.offer_events
  WHERE courier_id = _courier_id;

  IF o_total > 0 THEN
    acc_rate := round((o_accepted::numeric / o_total) * 100, 2);
  END IF;

  SELECT
    count(*) FILTER (WHERE delivered_at IS NOT NULL AND COALESCE(was_cancelled,false) = false),
    count(*) FILTER (WHERE COALESCE(was_cancelled,false) = true),
    avg(customer_rating)::numeric,
    avg(CASE WHEN COALESCE(was_late,false) = false THEN 100 ELSE 0 END)
  INTO j_done, j_cancel, rating, on_time
  FROM public.job_outcomes
  WHERE courier_id = _courier_id;

  INSERT INTO public.courier_stats AS cs (
    courier_id, offers_total, offers_accepted, offers_declined, offers_no_response,
    acceptance_rate, jobs_completed, jobs_cancelled, on_time_rate, avg_rating,
    avg_response_seconds, last_active_at, computed_at
  ) VALUES (
    _courier_id, COALESCE(o_total,0), COALESCE(o_accepted,0), COALESCE(o_declined,0), COALESCE(o_noresp,0),
    COALESCE(acc_rate,0), COALESCE(j_done,0), COALESCE(j_cancel,0),
    COALESCE(round(on_time,2),0), rating, resp_secs, last_act, now()
  )
  ON CONFLICT (courier_id) DO UPDATE SET
    offers_total = EXCLUDED.offers_total,
    offers_accepted = EXCLUDED.offers_accepted,
    offers_declined = EXCLUDED.offers_declined,
    offers_no_response = EXCLUDED.offers_no_response,
    acceptance_rate = EXCLUDED.acceptance_rate,
    jobs_completed = EXCLUDED.jobs_completed,
    jobs_cancelled = EXCLUDED.jobs_cancelled,
    on_time_rate = EXCLUDED.on_time_rate,
    avg_rating = EXCLUDED.avg_rating,
    avg_response_seconds = EXCLUDED.avg_response_seconds,
    last_active_at = EXCLUDED.last_active_at,
    computed_at = now();
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'courier_stats_courier_id_key'
  ) THEN
    ALTER TABLE public.courier_stats ADD CONSTRAINT courier_stats_courier_id_key UNIQUE (courier_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.tg_record_offer_from_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.direction = 'outbound' AND NEW.courier_id IS NOT NULL AND NEW.job_id IS NOT NULL THEN
    INSERT INTO public.offer_events (job_id, courier_id, channel, sent_at, response)
    SELECT NEW.job_id, NEW.courier_id, 'whatsapp', NEW.created_at, 'pending'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.offer_events
      WHERE job_id = NEW.job_id AND courier_id = NEW.courier_id AND channel = 'whatsapp'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_whatsapp_to_offer ON public.whatsapp_messages;
CREATE TRIGGER trg_whatsapp_to_offer
AFTER INSERT ON public.whatsapp_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_record_offer_from_whatsapp();

CREATE OR REPLACE FUNCTION public.tg_update_offers_on_job_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.selected_courier_id IS NOT NULL
     AND NEW.selected_courier_id IS DISTINCT FROM OLD.selected_courier_id THEN
    UPDATE public.offer_events
       SET response = 'accepted', responded_at = COALESCE(responded_at, now())
     WHERE job_id = NEW.id AND courier_id = NEW.selected_courier_id;
    UPDATE public.offer_events
       SET response = 'cancelled', responded_at = COALESCE(responded_at, now())
     WHERE job_id = NEW.id
       AND courier_id <> NEW.selected_courier_id
       AND response = 'pending';
  END IF;

  IF NEW.status::text = 'בוטלה' AND OLD.status::text IS DISTINCT FROM 'בוטלה' THEN
    UPDATE public.offer_events
       SET response = 'cancelled', responded_at = COALESCE(responded_at, now())
     WHERE job_id = NEW.id AND response = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jobs_update_offers ON public.jobs;
CREATE TRIGGER trg_jobs_update_offers
AFTER UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.tg_update_offers_on_job_change();

CREATE OR REPLACE FUNCTION public.tg_recompute_stats_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recompute_courier_stats(COALESCE(NEW.courier_id, OLD.courier_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_offer_recompute ON public.offer_events;
CREATE TRIGGER trg_offer_recompute
AFTER INSERT OR UPDATE OR DELETE ON public.offer_events
FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_stats_offer();

DROP TRIGGER IF EXISTS trg_outcome_recompute ON public.job_outcomes;
CREATE TRIGGER trg_outcome_recompute
AFTER INSERT OR UPDATE OR DELETE ON public.job_outcomes
FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_stats_offer();
