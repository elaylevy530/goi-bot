
-- 1. New columns on jobs for the strict English flow
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS delivery_status text,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS heading_to_pickup_at timestamptz,
  ADD COLUMN IF NOT EXISTS arrived_at_pickup_at timestamptz,
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS heading_to_dropoff_at timestamptz,
  ADD COLUMN IF NOT EXISTS arrived_at_dropoff_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS current_status_updated_at timestamptz;

-- 2. History table
CREATE TABLE IF NOT EXISTS public.delivery_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  courier_id uuid REFERENCES public.couriers(id),
  previous_status text,
  new_status text NOT NULL,
  action_source text NOT NULL DEFAULT 'system',
  external_message_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.delivery_status_history TO authenticated;
GRANT ALL ON public.delivery_status_history TO service_role;

ALTER TABLE public.delivery_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "history_read_admin" ON public.delivery_status_history;
CREATE POLICY "history_read_admin" ON public.delivery_status_history
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR courier_id = public.current_courier_id()
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = delivery_status_history.job_id
        AND j.customer_id = public.current_business_id()
    )
  );

CREATE INDEX IF NOT EXISTS idx_dsh_job ON public.delivery_status_history(job_id, created_at DESC);

-- 3. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_status_history;

-- 4. State machine RPC
CREATE OR REPLACE FUNCTION public.transition_delivery_status(
  _job_id uuid,
  _courier_id uuid,
  _requested_status text,
  _action_source text DEFAULT 'whatsapp',
  _external_message_id text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _job RECORD;
  _current text;
  _allowed boolean := false;
  _he_status text;
  _he_step text;
  _job_status text;
BEGIN
  SELECT * INTO _job FROM public.jobs WHERE id = _job_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF _job.selected_courier_id IS DISTINCT FROM _courier_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_assigned');
  END IF;

  _current := COALESCE(_job.delivery_status, 'assigned');

  -- idempotent: already in this state
  IF _current = _requested_status THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true, 'status', _current);
  END IF;

  -- allowed transitions
  _allowed := (
    (_current = 'assigned'             AND _requested_status = 'heading_to_pickup') OR
    (_current = 'heading_to_pickup'    AND _requested_status = 'arrived_at_pickup') OR
    (_current = 'arrived_at_pickup'    AND _requested_status = 'picked_up') OR
    (_current = 'picked_up'            AND _requested_status = 'heading_to_dropoff') OR
    (_current = 'heading_to_dropoff'   AND _requested_status = 'arrived_at_dropoff') OR
    (_current = 'arrived_at_dropoff'   AND _requested_status = 'delivered')
  );

  IF NOT _allowed THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_transition', 'current', _current);
  END IF;

  -- Hebrew mirrors for existing UI
  _he_step := CASE _requested_status
    WHEN 'heading_to_pickup'   THEN 'בדרך לאיסוף'
    WHEN 'arrived_at_pickup'   THEN 'הגעתי לאיסוף'
    WHEN 'picked_up'           THEN 'אספתי'
    WHEN 'heading_to_dropoff'  THEN 'בדרך למסירה'
    WHEN 'arrived_at_dropoff'  THEN 'הגעתי ללקוח'
    WHEN 'delivered'           THEN 'נמסר'
  END;
  _job_status := CASE WHEN _requested_status = 'delivered' THEN 'הושלמה' ELSE 'פעילה' END;

  UPDATE public.jobs
     SET delivery_status = _requested_status,
         current_status_updated_at = now(),
         courier_step = _he_step,
         status = _job_status::job_status,
         heading_to_pickup_at  = CASE WHEN _requested_status = 'heading_to_pickup'  THEN now() ELSE heading_to_pickup_at  END,
         arrived_at_pickup_at  = CASE WHEN _requested_status = 'arrived_at_pickup'  THEN now() ELSE arrived_at_pickup_at  END,
         picked_up_at          = CASE WHEN _requested_status = 'picked_up'          THEN now() ELSE picked_up_at          END,
         heading_to_dropoff_at = CASE WHEN _requested_status = 'heading_to_dropoff' THEN now() ELSE heading_to_dropoff_at END,
         arrived_at_dropoff_at = CASE WHEN _requested_status = 'arrived_at_dropoff' THEN now() ELSE arrived_at_dropoff_at END,
         delivered_at          = CASE WHEN _requested_status = 'delivered'          THEN now() ELSE delivered_at          END,
         updated_at = now()
   WHERE id = _job_id;

  -- also keep job_outcomes timestamps in sync (existing system reads these)
  INSERT INTO public.job_outcomes (job_id, courier_id) VALUES (_job_id, _courier_id)
    ON CONFLICT (job_id) DO UPDATE SET courier_id = EXCLUDED.courier_id;
  IF _requested_status = 'picked_up' THEN
    UPDATE public.job_outcomes SET picked_up_at = COALESCE(picked_up_at, now()) WHERE job_id = _job_id;
  ELSIF _requested_status = 'delivered' THEN
    UPDATE public.job_outcomes SET delivered_at = COALESCE(delivered_at, now()) WHERE job_id = _job_id;
  END IF;

  INSERT INTO public.delivery_status_history(
    job_id, courier_id, previous_status, new_status, action_source, external_message_id, metadata
  ) VALUES (_job_id, _courier_id, _current, _requested_status, COALESCE(_action_source,'system'), _external_message_id, COALESCE(_metadata,'{}'::jsonb));

  -- notify business
  IF _job.customer_id IS NOT NULL THEN
    PERFORM public.notify_business(
      _job.customer_id, _job_id, 'progress',
      CASE _requested_status
        WHEN 'heading_to_pickup'  THEN '🚚 השליח יצא לאיסוף'
        WHEN 'arrived_at_pickup'  THEN '📍 השליח הגיע לאיסוף'
        WHEN 'picked_up'          THEN '📦 המשלוח נאסף'
        WHEN 'heading_to_dropoff' THEN '🛵 השליח בדרך ללקוח'
        WHEN 'arrived_at_dropoff' THEN '📍 השליח הגיע ללקוח'
        WHEN 'delivered'          THEN '✅ המשלוח נמסר'
      END,
      'משלוח ' || COALESCE(_job.job_number,'') || ' עודכן',
      '/business/track/' || _job_id::text
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', _requested_status, 'previous', _current);
END $$;

GRANT EXECUTE ON FUNCTION public.transition_delivery_status(uuid,uuid,text,text,text,jsonb) TO authenticated, service_role;

-- 5. Initialize delivery_status for already-assigned jobs that haven't started flow
UPDATE public.jobs SET delivery_status = 'assigned'
 WHERE delivery_status IS NULL AND selected_courier_id IS NOT NULL;
