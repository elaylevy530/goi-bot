DROP POLICY IF EXISTS "Business creates own jobs" ON public.jobs;
CREATE POLICY "Business creates own jobs" ON public.jobs
FOR INSERT TO authenticated
WITH CHECK (
  customer_id = current_business_id()
  AND status IN ('טיוטה'::job_status, 'נשלחה לשליחים'::job_status)
);

-- Also allow businesses to update / cancel own jobs (used by order detail)
DROP POLICY IF EXISTS "Business updates own jobs" ON public.jobs;
CREATE POLICY "Business updates own jobs" ON public.jobs
FOR UPDATE TO authenticated
USING (customer_id = current_business_id())
WITH CHECK (customer_id = current_business_id());