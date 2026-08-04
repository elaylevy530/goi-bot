DROP POLICY IF EXISTS "Business reads own job logs" ON public.status_logs;
CREATE POLICY "Business reads own job logs" ON public.status_logs
FOR SELECT TO authenticated
USING (
  entity_type = 'job'
  AND EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = status_logs.entity_id
      AND j.customer_id = public.current_business_id()
  )
);