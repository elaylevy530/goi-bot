CREATE POLICY "Courier reads own withdrawals" ON public.withdrawal_requests
  FOR SELECT TO authenticated
  USING (courier_id = public.current_courier_id());

CREATE POLICY "Courier creates own withdrawals" ON public.withdrawal_requests
  FOR INSERT TO authenticated
  WITH CHECK (courier_id = public.current_courier_id() AND status = 'ממתינה');