
-- Allow couriers to read open broadcast jobs (fixed price, sent to couriers, no courier selected yet)
CREATE POLICY "Couriers read open broadcast jobs"
ON public.jobs FOR SELECT
USING (
  current_courier_id() IS NOT NULL
  AND selected_courier_id IS NULL
  AND COALESCE(pricing_type, 'fixed') <> 'quote_request'
  AND (status)::text = 'נשלחה לשליחים'
);

-- Allow couriers to claim an open broadcast job by updating selected_courier_id to themselves
CREATE POLICY "Couriers claim open jobs"
ON public.jobs FOR UPDATE
USING (
  current_courier_id() IS NOT NULL
  AND selected_courier_id IS NULL
  AND (status)::text = 'נשלחה לשליחים'
)
WITH CHECK (
  selected_courier_id = current_courier_id()
);
