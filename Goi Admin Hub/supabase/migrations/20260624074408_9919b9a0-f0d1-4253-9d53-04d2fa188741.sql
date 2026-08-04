-- 1. Add multi-stop flag and totals to jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS is_multi_stop boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_distance_km numeric,
  ADD COLUMN IF NOT EXISTS stops_count integer;

-- 2. Stop type enum
DO $$ BEGIN
  CREATE TYPE public.stop_type AS ENUM ('pickup', 'dropoff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.stop_status AS ENUM ('pending', 'arrived', 'done', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. job_stops table
CREATE TABLE IF NOT EXISTS public.job_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  stop_order integer NOT NULL,
  stop_type public.stop_type NOT NULL,
  -- Linkage: a dropoff points to which pickup it belongs to.
  linked_pickup_id uuid REFERENCES public.job_stops(id) ON DELETE SET NULL,
  -- Location
  address text,
  area text,
  lat numeric,
  lng numeric,
  -- Contact (sender for pickup, recipient for dropoff)
  contact_name text,
  contact_phone text,
  -- Package details (mainly for pickup)
  package_description text,
  package_size text,
  number_of_packages integer DEFAULT 1,
  fragile boolean DEFAULT false,
  -- Per-stop public track token (only dropoffs send to recipients)
  public_token text UNIQUE DEFAULT encode(gen_random_bytes(18), 'base64'),
  -- Status tracking
  status public.stop_status NOT NULL DEFAULT 'pending',
  arrived_at timestamptz,
  done_at timestamptz,
  -- Proof of delivery
  proof_photo_url text,
  signature_url text,
  notes text,
  -- Timing
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, stop_order)
);

CREATE INDEX IF NOT EXISTS idx_job_stops_job ON public.job_stops(job_id, stop_order);
CREATE INDEX IF NOT EXISTS idx_job_stops_token ON public.job_stops(public_token);
CREATE INDEX IF NOT EXISTS idx_job_stops_linked ON public.job_stops(linked_pickup_id);

-- 4. GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_stops TO authenticated;
GRANT SELECT ON public.job_stops TO anon;
GRANT ALL ON public.job_stops TO service_role;

-- 5. RLS
ALTER TABLE public.job_stops ENABLE ROW LEVEL SECURITY;

-- Business sees stops of its own jobs
CREATE POLICY "business_view_own_job_stops"
ON public.job_stops FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_stops.job_id
      AND j.customer_id = public.current_business_id()
  )
);

-- Business modifies stops on its own open jobs
CREATE POLICY "business_modify_own_job_stops"
ON public.job_stops FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_stops.job_id
      AND j.customer_id = public.current_business_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_stops.job_id
      AND j.customer_id = public.current_business_id()
  )
);

-- Assigned courier sees stops of the job they accepted
CREATE POLICY "courier_view_assigned_job_stops"
ON public.job_stops FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_stops.job_id
      AND j.selected_courier_id = public.current_courier_id()
  )
);

-- Assigned courier updates stops (only status / arrived_at / done_at via the RPC, but allow row update)
CREATE POLICY "courier_update_assigned_job_stops"
ON public.job_stops FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_stops.job_id
      AND j.selected_courier_id = public.current_courier_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_stops.job_id
      AND j.selected_courier_id = public.current_courier_id()
  )
);

-- Admin sees and manages all
CREATE POLICY "admin_all_job_stops"
ON public.job_stops FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Public anon access ONLY via the per-stop token (used by track page)
CREATE POLICY "anon_view_by_token"
ON public.job_stops FOR SELECT
TO anon
USING (public_token IS NOT NULL);

-- 6. updated_at trigger
CREATE TRIGGER trg_job_stops_updated_at
  BEFORE UPDATE ON public.job_stops
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 7. Courier RPC: update stop status (arrived / done)
CREATE OR REPLACE FUNCTION public.courier_update_stop_status(
  _stop_id uuid,
  _new_status text,
  _notes text DEFAULT NULL,
  _proof_photo_url text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cid uuid := public.current_active_courier_id();
  _stop record;
  _job record;
  _remaining int;
BEGIN
  IF _cid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_active');
  END IF;

  IF _new_status NOT IN ('arrived', 'done') THEN
    RAISE EXCEPTION 'Invalid status: %', _new_status;
  END IF;

  SELECT * INTO _stop FROM public.job_stops WHERE id = _stop_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  SELECT id, job_number, customer_id, selected_courier_id, status, is_multi_stop
    INTO _job FROM public.jobs WHERE id = _stop.job_id FOR UPDATE;
  IF _job.selected_courier_id IS DISTINCT FROM _cid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_your_job');
  END IF;

  -- Update the stop
  UPDATE public.job_stops
     SET status = _new_status::public.stop_status,
         arrived_at = CASE WHEN _new_status = 'arrived' AND arrived_at IS NULL THEN now() ELSE arrived_at END,
         done_at = CASE WHEN _new_status = 'done' THEN now() ELSE done_at END,
         notes = COALESCE(_notes, notes),
         proof_photo_url = COALESCE(_proof_photo_url, proof_photo_url),
         updated_at = now()
   WHERE id = _stop_id;

  -- Notify business
  PERFORM public.notify_business(
    _job.customer_id, _job.id,
    'progress',
    CASE
      WHEN _new_status = 'arrived' AND _stop.stop_type = 'pickup' THEN '📍 השליח הגיע לנקודת איסוף ' || _stop.stop_order
      WHEN _new_status = 'arrived' AND _stop.stop_type = 'dropoff' THEN '📍 השליח הגיע ללקוח ' || COALESCE(_stop.contact_name, '#' || _stop.stop_order)
      WHEN _new_status = 'done' AND _stop.stop_type = 'pickup' THEN '📦 נאספה חבילה מ' || COALESCE(_stop.address, '#' || _stop.stop_order)
      WHEN _new_status = 'done' AND _stop.stop_type = 'dropoff' THEN '✅ נמסר ל' || COALESCE(_stop.contact_name, '#' || _stop.stop_order)
    END,
    'משלוח ' || COALESCE(_job.job_number, ''),
    '/business/track/' || _job.id::text
  );

  -- If this was a dropoff that's done, check if all dropoffs are done -> mark job completed
  IF _new_status = 'done' AND _stop.stop_type = 'dropoff' THEN
    SELECT count(*) INTO _remaining
      FROM public.job_stops
     WHERE job_id = _stop.job_id
       AND stop_type = 'dropoff'
       AND status <> 'done';
    IF _remaining = 0 THEN
      UPDATE public.jobs
         SET status = 'הושלמה'::job_status,
             delivery_status = 'delivered',
             courier_step = 'נמסר',
             delivered_at = now(),
             current_status_updated_at = now(),
             updated_at = now()
       WHERE id = _stop.job_id;

      INSERT INTO public.job_outcomes (job_id, courier_id, delivered_at, picked_up_at)
      VALUES (_stop.job_id, _cid, now(), now())
      ON CONFLICT (job_id) DO UPDATE
        SET delivered_at = COALESCE(public.job_outcomes.delivered_at, now()),
            picked_up_at = COALESCE(public.job_outcomes.picked_up_at, now());
    END IF;
  END IF;

  -- If first pickup arrived, mark job as in-progress
  IF _new_status = 'arrived' AND _job.status::text NOT IN ('הושלמה','בוטלה') THEN
    UPDATE public.jobs
       SET status = 'פעילה'::job_status,
           current_status_updated_at = now(),
           updated_at = now()
     WHERE id = _stop.job_id AND status::text <> 'פעילה';
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', _new_status);
END $$;

-- 8. Helper: order stops greedy nearest-neighbor with pickup-before-dropoff constraint
CREATE OR REPLACE FUNCTION public.optimize_stop_order(_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _stops record;
  _next record;
  _cur_lat numeric;
  _cur_lng numeric;
  _order int := 1;
  _visited uuid[] := ARRAY[]::uuid[];
  _pickup_done uuid[] := ARRAY[]::uuid[];
BEGIN
  -- Pick first stop = first pickup (no constraint to optimize from yet)
  SELECT * INTO _stops FROM public.job_stops
   WHERE job_id = _job_id AND stop_type = 'pickup'
   ORDER BY stop_order LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.job_stops SET stop_order = _order WHERE id = _stops.id;
  _cur_lat := _stops.lat; _cur_lng := _stops.lng;
  _visited := array_append(_visited, _stops.id);
  _pickup_done := array_append(_pickup_done, _stops.id);
  _order := _order + 1;

  LOOP
    -- Find nearest eligible stop: any pickup not visited, or dropoff whose linked pickup is done (or no link)
    SELECT s.* INTO _next
      FROM public.job_stops s
     WHERE s.job_id = _job_id
       AND NOT (s.id = ANY(_visited))
       AND (
         s.stop_type = 'pickup'
         OR s.linked_pickup_id IS NULL
         OR s.linked_pickup_id = ANY(_pickup_done)
       )
     ORDER BY
       CASE WHEN _cur_lat IS NULL OR _cur_lng IS NULL OR s.lat IS NULL OR s.lng IS NULL THEN 999999
            ELSE (s.lat - _cur_lat)^2 + (s.lng - _cur_lng)^2 END
     LIMIT 1;
    EXIT WHEN NOT FOUND;

    UPDATE public.job_stops SET stop_order = _order WHERE id = _next.id;
    _visited := array_append(_visited, _next.id);
    IF _next.stop_type = 'pickup' THEN
      _pickup_done := array_append(_pickup_done, _next.id);
    END IF;
    _cur_lat := _next.lat; _cur_lng := _next.lng;
    _order := _order + 1;
  END LOOP;

  UPDATE public.jobs SET stops_count = _order - 1, updated_at = now() WHERE id = _job_id;
END $$;
