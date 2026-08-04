
CREATE TABLE public.courier_job_declines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id uuid NOT NULL REFERENCES public.couriers(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  declined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(courier_id, job_id)
);

GRANT SELECT, INSERT, DELETE ON public.courier_job_declines TO authenticated;
GRANT ALL ON public.courier_job_declines TO service_role;

ALTER TABLE public.courier_job_declines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couriers manage their own declines"
ON public.courier_job_declines
FOR ALL
TO authenticated
USING (courier_id = public.current_courier_id() OR public.is_admin())
WITH CHECK (courier_id = public.current_courier_id() OR public.is_admin());

CREATE INDEX idx_courier_job_declines_courier ON public.courier_job_declines(courier_id);
