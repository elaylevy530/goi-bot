
-- Allow couriers to log progress on their assigned jobs.
CREATE OR REPLACE FUNCTION public.courier_update_job_progress(
  _job_id UUID,
  _step TEXT,
  _note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cid UUID := public.current_courier_id();
  _job RECORD;
BEGIN
  IF _cid IS NULL THEN
    RAISE EXCEPTION 'Not a courier';
  END IF;

  SELECT id, selected_courier_id, status INTO _job
  FROM public.jobs WHERE id = _job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found';
  END IF;
  IF _job.selected_courier_id IS DISTINCT FROM _cid THEN
    RAISE EXCEPTION 'Not your job';
  END IF;

  IF _step NOT IN ('בדרך לאיסוף','הגעתי לאיסוף','אספתי','בדרך למסירה','נמסר','הושלם') THEN
    RAISE EXCEPTION 'Invalid step: %', _step;
  END IF;

  -- Ensure outcome row exists
  INSERT INTO public.job_outcomes (job_id, courier_id)
  VALUES (_job_id, _cid)
  ON CONFLICT (job_id) DO NOTHING;

  IF _step = 'אספתי' THEN
    UPDATE public.job_outcomes SET picked_up_at = COALESCE(picked_up_at, now())
      WHERE job_id = _job_id;
  ELSIF _step = 'נמסר' THEN
    UPDATE public.job_outcomes SET delivered_at = COALESCE(delivered_at, now())
      WHERE job_id = _job_id;
  ELSIF _step = 'הושלם' THEN
    UPDATE public.job_outcomes SET delivered_at = COALESCE(delivered_at, now())
      WHERE job_id = _job_id;
    UPDATE public.jobs SET status = 'הושלמה'::job_status WHERE id = _job_id;
  END IF;

  INSERT INTO public.status_logs (entity_type, entity_id, old_status, new_status, note, changed_by)
  VALUES ('job', _job_id, _job.status::text, _step, _note, auth.uid());

  RETURN jsonb_build_object('ok', true, 'step', _step);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.courier_update_job_progress(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.courier_update_job_progress(UUID, TEXT, TEXT) TO authenticated;

-- Courier can read their own progress logs (for the My Day timeline)
DROP POLICY IF EXISTS "Courier reads own job logs" ON public.status_logs;
CREATE POLICY "Courier reads own job logs" ON public.status_logs
  FOR SELECT TO authenticated
  USING (
    entity_type = 'job'
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = status_logs.entity_id
        AND j.selected_courier_id = public.current_courier_id()
    )
  );
