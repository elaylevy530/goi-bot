DROP POLICY IF EXISTS "Anyone can read order by id" ON public.storefront_orders;

CREATE POLICY "Business owner reads own orders"
  ON public.storefront_orders
  FOR SELECT
  TO authenticated
  USING (business_id = public.current_business_id() OR public.is_admin());

REVOKE SELECT ON public.storefront_orders FROM anon;