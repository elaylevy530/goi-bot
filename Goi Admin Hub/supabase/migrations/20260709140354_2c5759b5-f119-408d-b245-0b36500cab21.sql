DROP POLICY IF EXISTS "Anyone can place order on active storefront" ON public.storefront_orders;

CREATE POLICY "Anyone can place order on active storefront"
  ON public.storefront_orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.storefronts s
      WHERE s.id = storefront_orders.storefront_id
        AND s.business_id = storefront_orders.business_id
        AND COALESCE(s.is_active, true) = true
    )
  );