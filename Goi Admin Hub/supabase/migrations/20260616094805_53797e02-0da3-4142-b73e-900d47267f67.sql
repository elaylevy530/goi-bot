
-- ============= ENUMS =============
DO $$ BEGIN
  CREATE TYPE public.offer_channel AS ENUM ('whatsapp', 'bot', 'manual', 'app');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.offer_response AS ENUM ('pending', 'accepted', 'declined', 'no_response', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============= OFFER EVENTS =============
CREATE TABLE public.offer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  courier_id uuid NOT NULL REFERENCES public.couriers(id) ON DELETE CASCADE,
  channel public.offer_channel NOT NULL DEFAULT 'whatsapp',
  sent_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  response public.offer_response NOT NULL DEFAULT 'pending',
  decline_reason text,
  distance_km numeric(6,2),
  match_score numeric(5,2),
  courier_lat numeric(9,6),
  courier_lng numeric(9,6),
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_offer_events_job ON public.offer_events(job_id);
CREATE INDEX idx_offer_events_courier ON public.offer_events(courier_id);
CREATE INDEX idx_offer_events_response ON public.offer_events(response);
CREATE INDEX idx_offer_events_sent_at ON public.offer_events(sent_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_events TO authenticated;
GRANT ALL ON public.offer_events TO service_role;
ALTER TABLE public.offer_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage offer_events" ON public.offer_events
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER tg_offer_events_updated_at BEFORE UPDATE ON public.offer_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============= JOB OUTCOMES =============
CREATE TABLE public.job_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL UNIQUE REFERENCES public.jobs(id) ON DELETE CASCADE,
  courier_id uuid REFERENCES public.couriers(id) ON DELETE SET NULL,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  expected_delivery_at timestamptz,
  was_late boolean,
  late_minutes integer,
  was_cancelled boolean NOT NULL DEFAULT false,
  cancellation_reason text,
  customer_rating numeric(3,2),
  customer_comment text,
  tip_amount numeric(10,2),
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_outcomes_courier ON public.job_outcomes(courier_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_outcomes TO authenticated;
GRANT ALL ON public.job_outcomes TO service_role;
ALTER TABLE public.job_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage job_outcomes" ON public.job_outcomes
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER tg_job_outcomes_updated_at BEFORE UPDATE ON public.job_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============= COURIER LOCATION PINGS =============
CREATE TABLE public.courier_location_pings (
  id bigserial PRIMARY KEY,
  courier_id uuid NOT NULL REFERENCES public.couriers(id) ON DELETE CASCADE,
  lat numeric(9,6) NOT NULL,
  lng numeric(9,6) NOT NULL,
  accuracy_m numeric(6,2),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pings_courier_time ON public.courier_location_pings(courier_id, recorded_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.courier_location_pings TO authenticated;
GRANT ALL ON public.courier_location_pings TO service_role;
ALTER TABLE public.courier_location_pings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage location pings" ON public.courier_location_pings
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============= COURIER STATS (aggregate) =============
CREATE TABLE public.courier_stats (
  courier_id uuid PRIMARY KEY REFERENCES public.couriers(id) ON DELETE CASCADE,
  offers_total integer NOT NULL DEFAULT 0,
  offers_accepted integer NOT NULL DEFAULT 0,
  offers_declined integer NOT NULL DEFAULT 0,
  offers_no_response integer NOT NULL DEFAULT 0,
  acceptance_rate numeric(5,2),
  jobs_completed integer NOT NULL DEFAULT 0,
  jobs_cancelled integer NOT NULL DEFAULT 0,
  on_time_rate numeric(5,2),
  avg_rating numeric(3,2),
  avg_response_seconds integer,
  last_active_at timestamptz,
  computed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.courier_stats TO authenticated;
GRANT ALL ON public.courier_stats TO service_role;
ALTER TABLE public.courier_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage courier_stats" ON public.courier_stats
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============= EXTRA FIELDS ON COURIERS =============
ALTER TABLE public.couriers
  ADD COLUMN IF NOT EXISTS has_thermal_bag boolean,
  ADD COLUMN IF NOT EXISTS cargo_capacity text,
  ADD COLUMN IF NOT EXISTS max_package_value numeric(10,2),
  ADD COLUMN IF NOT EXISTS typical_hours text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS preferred_job_types text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS home_lat numeric(9,6),
  ADD COLUMN IF NOT EXISTS home_lng numeric(9,6);

-- ============= EXTRA FIELDS ON JOBS =============
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS distance_km numeric(6,2),
  ADD COLUMN IF NOT EXISTS item_category text,
  ADD COLUMN IF NOT EXISTS item_value numeric(10,2),
  ADD COLUMN IF NOT EXISTS requires_cash boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_refrigeration boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_thermal_bag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pickup_lat numeric(9,6),
  ADD COLUMN IF NOT EXISTS pickup_lng numeric(9,6),
  ADD COLUMN IF NOT EXISTS dropoff_lat numeric(9,6),
  ADD COLUMN IF NOT EXISTS dropoff_lng numeric(9,6),
  ADD COLUMN IF NOT EXISTS time_window_minutes integer;
