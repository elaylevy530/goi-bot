CREATE POLICY "Business reads assigned courier" ON public.couriers FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.customers c ON c.id = j.customer_id
    WHERE j.selected_courier_id = couriers.id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Business reads courier stats of assigned" ON public.courier_stats FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.customers c ON c.id = j.customer_id
    WHERE j.selected_courier_id = courier_stats.courier_id
      AND c.user_id = auth.uid()
  )
);