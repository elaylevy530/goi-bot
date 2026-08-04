
-- Helper: courier id for current auth user
CREATE OR REPLACE FUNCTION public.current_courier_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.couriers WHERE user_id = auth.uid() LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.current_courier_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_courier_id() TO authenticated;

-- couriers: courier reads & updates own row
CREATE POLICY "Courier reads own row" ON public.couriers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Courier updates own row" ON public.couriers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- offer_events: courier sees own offers
CREATE POLICY "Courier reads own offers" ON public.offer_events
  FOR SELECT TO authenticated
  USING (courier_id = public.current_courier_id());

CREATE POLICY "Courier updates own offer response" ON public.offer_events
  FOR UPDATE TO authenticated
  USING (courier_id = public.current_courier_id())
  WITH CHECK (courier_id = public.current_courier_id());

-- jobs: courier sees jobs they were offered or selected for
CREATE POLICY "Courier reads relevant jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (
    selected_courier_id = public.current_courier_id()
    OR EXISTS (
      SELECT 1 FROM public.offer_events oe
      WHERE oe.job_id = jobs.id AND oe.courier_id = public.current_courier_id()
    )
  );

-- job_outcomes: courier reads own outcomes
CREATE POLICY "Courier reads own outcomes" ON public.job_outcomes
  FOR SELECT TO authenticated
  USING (courier_id = public.current_courier_id());
