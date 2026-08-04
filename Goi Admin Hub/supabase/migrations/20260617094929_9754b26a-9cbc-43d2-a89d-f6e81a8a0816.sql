
CREATE POLICY "Couriers read open quote requests" ON public.jobs
  FOR SELECT TO authenticated
  USING (
    public.current_courier_id() IS NOT NULL
    AND pricing_type = 'quote_request'
    AND selected_quote_id IS NULL
    AND status::text NOT IN ('בוטלה','הושלמה')
  );
