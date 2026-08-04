-- Helper: current business id
CREATE OR REPLACE FUNCTION public.current_business_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.customers WHERE user_id = auth.uid() LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.current_business_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_business_id() TO authenticated, service_role;

-- Customers: business reads/updates its own row
DROP POLICY IF EXISTS "Business reads own customer row" ON public.customers;
CREATE POLICY "Business reads own customer row" ON public.customers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Business updates own customer row" ON public.customers;
CREATE POLICY "Business updates own customer row" ON public.customers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Jobs: business reads its own jobs
DROP POLICY IF EXISTS "Business reads own jobs" ON public.jobs;
CREATE POLICY "Business reads own jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (customer_id = public.current_business_id());

-- Jobs: business creates jobs assigned to itself (status must be draft/open)
DROP POLICY IF EXISTS "Business creates own jobs" ON public.jobs;
CREATE POLICY "Business creates own jobs" ON public.jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = public.current_business_id()
    AND status::text IN ('טיוטה','פתוחה')
  );

-- Whatsapp messages: business sees messages for its own jobs
DROP POLICY IF EXISTS "Business reads own job messages" ON public.whatsapp_messages;
CREATE POLICY "Business reads own job messages" ON public.whatsapp_messages
  FOR SELECT TO authenticated
  USING (job_id IN (SELECT id FROM public.jobs WHERE customer_id = public.current_business_id()));
