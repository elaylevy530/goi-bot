-- 1) Drop the broad anon SELECT policy on jobs that exposed full rows by tracking token.
DROP POLICY IF EXISTS "Public reads job by tracking token" ON public.jobs;
REVOKE SELECT ON public.jobs FROM anon;

-- 2) Tighten storefront_orders INSERT to require an active storefront.
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='storefront_orders' AND cmd='INSERT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.storefront_orders', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Anyone can place order on active storefront"
  ON public.storefront_orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.storefronts s
      WHERE s.id = storefront_orders.storefront_id
        AND COALESCE(s.is_active, true) = true
    )
  );