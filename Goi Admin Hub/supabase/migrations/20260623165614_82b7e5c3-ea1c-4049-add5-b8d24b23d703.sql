
CREATE OR REPLACE FUNCTION public.current_approved_courier_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.couriers
  WHERE user_id = auth.uid()
    AND courier_status = 'פעיל'
  LIMIT 1
$$;

DROP POLICY IF EXISTS "Active couriers read open broadcast jobs" ON public.jobs;
DROP POLICY IF EXISTS "Active couriers read open quote requests" ON public.jobs;
DROP POLICY IF EXISTS "Active couriers claim open jobs" ON public.jobs;

CREATE POLICY "Approved couriers read open broadcast jobs"
ON public.jobs FOR SELECT TO authenticated
USING (
  public.current_approved_courier_id() IS NOT NULL
  AND selected_courier_id IS NULL
  AND COALESCE(pricing_type, 'fixed') <> 'quote_request'
  AND status::text = 'נשלחה לשליחים'
);

CREATE POLICY "Approved couriers read open quote requests"
ON public.jobs FOR SELECT TO authenticated
USING (
  public.current_approved_courier_id() IS NOT NULL
  AND pricing_type = 'quote_request'
  AND selected_quote_id IS NULL
  AND status::text = ANY (ARRAY['נשלחה לשליחים','ממתינה לתגובות','יש שליחים שאישרו'])
);

CREATE POLICY "Active couriers claim open jobs"
ON public.jobs FOR UPDATE TO authenticated
USING (
  public.current_active_courier_id() IS NOT NULL
  AND selected_courier_id IS NULL
  AND status::text = 'נשלחה לשליחים'
);
