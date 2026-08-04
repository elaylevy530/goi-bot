DROP POLICY IF EXISTS "Business reads own job outcomes" ON public.job_outcomes;
CREATE POLICY "Business reads own job outcomes" ON public.job_outcomes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = job_outcomes.job_id
      AND j.customer_id = public.current_business_id()
  )
);

DROP POLICY IF EXISTS "Business updates own job outcomes" ON public.job_outcomes;
CREATE POLICY "Business updates own job outcomes" ON public.job_outcomes
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = job_outcomes.job_id
      AND j.customer_id = public.current_business_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = job_outcomes.job_id
      AND j.customer_id = public.current_business_id()
  )
);

DROP POLICY IF EXISTS "Business creates own job outcomes" ON public.job_outcomes;
CREATE POLICY "Business creates own job outcomes" ON public.job_outcomes
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = job_outcomes.job_id
      AND j.customer_id = public.current_business_id()
  )
);