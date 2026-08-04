
-- =========================================================================
-- 1. PRICING RULES (source of truth)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.pricing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  base_price NUMERIC NOT NULL DEFAULT 15,
  price_per_km NUMERIC NOT NULL DEFAULT 3,
  minimum_price NUMERIC NOT NULL DEFAULT 25,
  platform_fee_percent NUMERIC NOT NULL DEFAULT 15,
  platform_fee_fixed NUMERIC NOT NULL DEFAULT 0,
  waiting_fee_per_minute NUMERIC NOT NULL DEFAULT 0,
  extra_stop_fee NUMERIC NOT NULL DEFAULT 0,
  heavy_package_surcharge NUMERIC NOT NULL DEFAULT 0,
  night_surcharge_percent NUMERIC NOT NULL DEFAULT 0,
  weekend_surcharge_percent NUMERIC NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pricing_rules TO authenticated;
GRANT ALL ON public.pricing_rules TO service_role;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authed can read pricing" ON public.pricing_rules;
CREATE POLICY "Anyone authed can read pricing" ON public.pricing_rules
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage pricing" ON public.pricing_rules;
CREATE POLICY "Admins manage pricing" ON public.pricing_rules
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Only one active rule at a time
CREATE UNIQUE INDEX IF NOT EXISTS pricing_rules_one_active
  ON public.pricing_rules ((1)) WHERE is_active = true;

DROP TRIGGER IF EXISTS trg_pricing_rules_updated ON public.pricing_rules;
CREATE TRIGGER trg_pricing_rules_updated BEFORE UPDATE ON public.pricing_rules
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed current baseline if no active rule exists
INSERT INTO public.pricing_rules (name, is_active, base_price, price_per_km, minimum_price, platform_fee_percent, notes)
SELECT 'Pilot baseline', true, 15, 3, 25, 15, 'Seed: current production prices at launch'
WHERE NOT EXISTS (SELECT 1 FROM public.pricing_rules WHERE is_active = true);

CREATE OR REPLACE FUNCTION public.compute_job_price(_distance_km NUMERIC, _extra_stops INT DEFAULT 0, _is_heavy BOOLEAN DEFAULT false)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; base NUMERIC; dist NUMERIC; sub NUMERIC; surcharges NUMERIC; total NUMERIC; fee NUMERIC; payout NUMERIC;
BEGIN
  SELECT * INTO r FROM public.pricing_rules WHERE is_active = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error','no_active_pricing');
  END IF;
  base := r.base_price;
  dist := COALESCE(_distance_km,0) * r.price_per_km;
  surcharges := COALESCE(_extra_stops,0) * r.extra_stop_fee
              + CASE WHEN COALESCE(_is_heavy,false) THEN r.heavy_package_surcharge ELSE 0 END;
  sub := base + dist + surcharges;
  total := GREATEST(sub, r.minimum_price);
  fee := round((total * r.platform_fee_percent / 100.0)::numeric, 2) + r.platform_fee_fixed;
  payout := round((total - fee)::numeric, 2);
  RETURN jsonb_build_object(
    'pricing_version', r.version,
    'pricing_rule_id', r.id,
    'base_price', base,
    'distance_km', COALESCE(_distance_km,0),
    'distance_price', round(dist::numeric,2),
    'surcharges', round(surcharges::numeric,2),
    'subtotal', round(sub::numeric,2),
    'business_total', round(total::numeric,2),
    'platform_fee', round(fee::numeric,2),
    'courier_payout', payout,
    'computed_at', now()
  );
END $$;

-- =========================================================================
-- 2. PILOT SERVICE AREA
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.pilot_cities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_radius_km NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pilot_cities TO authenticated;
GRANT ALL ON public.pilot_cities TO service_role;
ALTER TABLE public.pilot_cities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone authed can read pilot cities" ON public.pilot_cities;
CREATE POLICY "Anyone authed can read pilot cities" ON public.pilot_cities
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage pilot cities" ON public.pilot_cities;
CREATE POLICY "Admins manage pilot cities" ON public.pilot_cities
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS trg_pilot_cities_updated ON public.pilot_cities;
CREATE TRIGGER trg_pilot_cities_updated BEFORE UPDATE ON public.pilot_cities
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.pilot_cities (city_name, is_active, notes) VALUES
  ('תל אביב', true, 'Pilot launch city'),
  ('תל אביב-יפו', true, NULL),
  ('רמת גן', true, NULL),
  ('גבעתיים', true, NULL),
  ('בני ברק', true, NULL),
  ('חולון', true, NULL),
  ('בת ים', true, NULL),
  ('הרצליה', true, NULL),
  ('רמת השרון', true, NULL),
  ('פתח תקווה', true, NULL),
  ('ראשון לציון', true, NULL)
ON CONFLICT (city_name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_pilot_area(_city TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pilot_cities
    WHERE is_active = true
      AND (
        city_name = _city
        OR _city ILIKE '%' || city_name || '%'
        OR city_name ILIKE '%' || _city || '%'
      )
  )
$$;

-- =========================================================================
-- 3. DELIVERY STATUS EVENTS (canonical actor-aware audit log)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.delivery_status_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('business','courier','admin','system','bot')),
  actor_id UUID,
  reason TEXT,
  source TEXT NOT NULL CHECK (source IN ('dashboard','whatsapp','admin','system','api')) DEFAULT 'system',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_delivery_status_events_delivery
  ON public.delivery_status_events (delivery_id, created_at DESC);
GRANT SELECT, INSERT ON public.delivery_status_events TO authenticated;
GRANT ALL ON public.delivery_status_events TO service_role;
ALTER TABLE public.delivery_status_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read all status events" ON public.delivery_status_events;
CREATE POLICY "Admins read all status events" ON public.delivery_status_events
  FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Stakeholders read their delivery events" ON public.delivery_status_events;
CREATE POLICY "Stakeholders read their delivery events" ON public.delivery_status_events
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = delivery_status_events.delivery_id
        AND (j.customer_id = public.current_business_id()
             OR j.selected_courier_id = public.current_courier_id())
    )
  );
DROP POLICY IF EXISTS "Authed insert status events" ON public.delivery_status_events;
CREATE POLICY "Authed insert status events" ON public.delivery_status_events
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_delivery_status_event(
  _delivery_id UUID,
  _previous TEXT,
  _new TEXT,
  _actor_type TEXT,
  _actor_id UUID,
  _reason TEXT,
  _source TEXT,
  _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id UUID;
BEGIN
  INSERT INTO public.delivery_status_events
    (delivery_id, previous_status, new_status, actor_type, actor_id, reason, source, metadata)
  VALUES (_delivery_id, _previous, _new, _actor_type, _actor_id, _reason, COALESCE(_source,'system'), COALESCE(_metadata,'{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END $$;

-- Auto-log every jobs.status change
CREATE OR REPLACE FUNCTION public.tg_log_job_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _actor TEXT; _actor_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL THEN
    _actor := 'system'; _actor_id := NULL;
  ELSIF public.is_admin() THEN
    _actor := 'admin'; _actor_id := auth.uid();
  ELSIF public.current_courier_id() IS NOT NULL THEN
    _actor := 'courier'; _actor_id := public.current_courier_id();
  ELSIF public.current_business_id() IS NOT NULL THEN
    _actor := 'business'; _actor_id := public.current_business_id();
  ELSE
    _actor := 'system'; _actor_id := auth.uid();
  END IF;
  PERFORM public.log_delivery_status_event(
    NEW.id,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.status::text ELSE NULL END,
    NEW.status::text,
    _actor, _actor_id, NULL, 'system',
    jsonb_build_object('delivery_status', NEW.delivery_status, 'courier_step', NEW.courier_step)
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_job_status_change ON public.jobs;
CREATE TRIGGER trg_log_job_status_change
  AFTER INSERT OR UPDATE OF status ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.tg_log_job_status_change();

-- =========================================================================
-- 4. WEBHOOK EVENTS (provider-neutral idempotency)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  event_type TEXT,
  payload JSONB,
  processed_at TIMESTAMPTZ,
  processing_status TEXT NOT NULL DEFAULT 'received',
  processing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_webhook_events_provider_event
  ON public.webhook_events (provider, external_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.webhook_events (processing_status, created_at DESC);
GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read webhook events" ON public.webhook_events;
CREATE POLICY "Admins read webhook events" ON public.webhook_events
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.register_webhook_event(
  _provider TEXT, _external_id TEXT, _event_type TEXT, _payload JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id UUID; _existed BOOLEAN := false;
BEGIN
  IF _external_id IS NULL OR length(_external_id) = 0 THEN
    INSERT INTO public.webhook_events (provider, external_event_id, event_type, payload, processing_status)
    VALUES (_provider, 'noid_' || gen_random_uuid()::text, _event_type, _payload, 'received')
    RETURNING id INTO _id;
    RETURN jsonb_build_object('id', _id, 'duplicate', false);
  END IF;
  INSERT INTO public.webhook_events (provider, external_event_id, event_type, payload, processing_status)
  VALUES (_provider, _external_id, _event_type, _payload, 'received')
  ON CONFLICT (provider, external_event_id) DO NOTHING
  RETURNING id INTO _id;
  IF _id IS NULL THEN
    SELECT id INTO _id FROM public.webhook_events WHERE provider = _provider AND external_event_id = _external_id;
    _existed := true;
  END IF;
  RETURN jsonb_build_object('id', _id, 'duplicate', _existed);
END $$;

-- Harden existing Green webhook table too (best-effort unique on external_message_id)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='green_api_webhook_events' AND column_name='external_message_id') THEN
    BEGIN
      CREATE UNIQUE INDEX IF NOT EXISTS uq_green_api_webhook_external_message_id
        ON public.green_api_webhook_events (external_message_id)
        WHERE external_message_id IS NOT NULL;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;

-- =========================================================================
-- 5. WHATSAPP SERVICE WINDOW
-- =========================================================================
ALTER TABLE public.couriers
  ADD COLUMN IF NOT EXISTS last_incoming_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS service_window_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_provider TEXT,
  ADD COLUMN IF NOT EXISTS last_message_status TEXT;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS last_incoming_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS service_window_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_provider TEXT,
  ADD COLUMN IF NOT EXISTS last_message_status TEXT;

CREATE OR REPLACE FUNCTION public.wa_service_window_open(_phone TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.couriers
    WHERE whatsapp_phone = _phone AND service_window_expires_at > now()
  ) OR EXISTS (
    SELECT 1 FROM public.customers
    WHERE phone = _phone AND service_window_expires_at > now()
  )
$$;

CREATE OR REPLACE FUNCTION public.wa_record_inbound(_phone TEXT, _provider TEXT DEFAULT 'green')
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _now TIMESTAMPTZ := now(); _exp TIMESTAMPTZ := now() + interval '24 hours';
BEGIN
  UPDATE public.couriers
    SET last_incoming_message_at = _now,
        service_window_expires_at = _exp,
        whatsapp_provider = _provider
    WHERE whatsapp_phone = _phone;
  UPDATE public.customers
    SET last_incoming_message_at = _now,
        service_window_expires_at = _exp,
        whatsapp_provider = _provider
    WHERE phone = _phone;
END $$;

-- =========================================================================
-- 6. NOTIFICATION QUEUE (retry + backoff)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  recipient_phone TEXT NOT NULL,
  recipient_courier_id UUID,
  recipient_business_id UUID,
  job_id UUID,
  message_type TEXT NOT NULL DEFAULT 'text',
  body TEXT,
  buttons JSONB,
  template_name TEXT,
  template_params JSONB,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','failed','dead')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  provider TEXT,
  external_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_queue_due ON public.notification_queue (status, next_attempt_at);
GRANT SELECT ON public.notification_queue TO authenticated;
GRANT ALL ON public.notification_queue TO service_role;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read notif queue" ON public.notification_queue;
CREATE POLICY "Admins read notif queue" ON public.notification_queue
  FOR SELECT TO authenticated USING (public.is_admin());

DROP TRIGGER IF EXISTS trg_notif_queue_updated ON public.notification_queue;
CREATE TRIGGER trg_notif_queue_updated BEFORE UPDATE ON public.notification_queue
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================================
-- 7. CENTRAL ELIGIBILITY FUNCTIONS
-- =========================================================================
CREATE OR REPLACE FUNCTION public.courier_can_receive_jobs(_courier_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c RECORD; reasons TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT * INTO c FROM public.couriers WHERE id = _courier_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible', false, 'reasons', ARRAY['not_found']); END IF;
  IF c.courier_status::text <> 'פעיל' THEN reasons := array_append(reasons, 'not_approved'); END IF;
  IF COALESCE(c.admin_jobs_blocked, false) THEN reasons := array_append(reasons, 'admin_blocked'); END IF;
  IF COALESCE(c.is_paused, false) THEN reasons := array_append(reasons, 'paused'); END IF;
  IF COALESCE(c.accepting_jobs, true) = false THEN reasons := array_append(reasons, 'not_accepting'); END IF;
  IF c.whatsapp_phone IS NULL OR length(c.whatsapp_phone) < 7 THEN reasons := array_append(reasons, 'phone_missing'); END IF;
  IF COALESCE(c.whatsapp_opt_in, true) = false THEN reasons := array_append(reasons, 'wa_opt_out'); END IF;
  RETURN jsonb_build_object('eligible', array_length(reasons,1) IS NULL, 'reasons', reasons);
END $$;

CREATE OR REPLACE FUNCTION public.business_can_create_delivery(_business_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE b RECORD; reasons TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT * INTO b FROM public.customers WHERE id = _business_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible', false, 'reasons', ARRAY['not_found']); END IF;
  IF COALESCE(b.payment_method_on_file, false) = false THEN reasons := array_append(reasons, 'no_payment_method'); END IF;
  -- approval / suspension flags (best-effort, columns may not exist on every row)
  BEGIN
    IF b.status IN ('חסום','מושעה','suspended','blocked') THEN reasons := array_append(reasons, 'suspended'); END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN jsonb_build_object('eligible', array_length(reasons,1) IS NULL, 'reasons', reasons);
END $$;

-- =========================================================================
-- 8. PILOT AREA VALIDATION ON JOB INSERT
-- =========================================================================
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS pilot_area_override BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB;

CREATE OR REPLACE FUNCTION public.tg_validate_pilot_area()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.pilot_area_override, false) THEN RETURN NEW; END IF;
  IF public.is_admin() THEN RETURN NEW; END IF;
  IF NEW.pickup_area IS NULL THEN RETURN NEW; END IF;
  IF NOT public.is_pilot_area(NEW.pickup_area) THEN
    RAISE EXCEPTION 'Goi פועלת כעת רק באזורים הפעילים בפיילוט. כתובת האיסוף (%) מחוץ לאזור המורשה.', NEW.pickup_area
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.dropoff_area IS NOT NULL AND NOT public.is_pilot_area(NEW.dropoff_area) THEN
    -- dropoffs allowed if pickup is in pilot — soft check; just log
    NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_pilot_area ON public.jobs;
CREATE TRIGGER trg_validate_pilot_area
  BEFORE INSERT ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.tg_validate_pilot_area();

-- =========================================================================
-- 9. ENABLE REALTIME on the new tables that dashboards subscribe to
-- =========================================================================
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_status_events; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_queue; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
