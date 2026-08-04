DROP POLICY IF EXISTS "Active couriers read open broadcast jobs" ON public.jobs;
DROP POLICY IF EXISTS "Active couriers read open quote requests" ON public.jobs;

CREATE POLICY "Active couriers read open broadcast jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (
    public.current_active_courier_id() IS NOT NULL
    AND selected_courier_id IS NULL
    AND status = 'נשלחה לשליחים'::job_status
    AND COALESCE(pricing_type, 'fixed') <> 'quote_request'
  );

CREATE POLICY "Active couriers read open quote requests" ON public.jobs
  FOR SELECT TO authenticated
  USING (
    public.current_active_courier_id() IS NOT NULL
    AND selected_quote_id IS NULL
    AND pricing_type = 'quote_request'
    AND status::text IN ('נשלחה לשליחים','ממתינה לתגובות','יש שליחים שאישרו')
  );
