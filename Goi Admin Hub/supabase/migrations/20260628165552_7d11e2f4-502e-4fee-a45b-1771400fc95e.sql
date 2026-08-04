
-- 1a. wa_poll_options: restrict permissive ALL true/true to service_role only
DROP POLICY IF EXISTS "service role only" ON public.wa_poll_options;
CREATE POLICY "service role only" ON public.wa_poll_options
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 1b. delivery_status_events: replace WITH CHECK (true) with actor validation
DROP POLICY IF EXISTS "Authed insert status events" ON public.delivery_status_events;
CREATE POLICY "Authed insert status events" ON public.delivery_status_events
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    OR public.is_admin()
  );

-- 2. notification_queue: scoped self-read for couriers and businesses
CREATE POLICY "Couriers read own notifications" ON public.notification_queue
  FOR SELECT TO authenticated
  USING (
    recipient_courier_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.couriers c
      WHERE c.id = recipient_courier_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Businesses read own notifications" ON public.notification_queue
  FOR SELECT TO authenticated
  USING (
    recipient_business_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.customers cu
      WHERE cu.id = recipient_business_id AND cu.user_id = auth.uid()
    )
  );

-- 3. storefronts: hide Stripe internals from anon/authenticated column reads
REVOKE SELECT (stripe_account_id, stripe_charges_enabled)
  ON public.storefronts FROM anon, authenticated;
GRANT SELECT (stripe_account_id, stripe_charges_enabled)
  ON public.storefronts TO service_role;
