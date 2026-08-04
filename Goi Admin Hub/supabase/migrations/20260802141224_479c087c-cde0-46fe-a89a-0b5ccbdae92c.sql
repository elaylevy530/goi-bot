CREATE TABLE public.job_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('take','quote')),
  full_name text NOT NULL,
  phone text NOT NULL,
  price numeric,
  note text,
  partner_slug text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.job_leads TO authenticated;
GRANT ALL ON public.job_leads TO service_role;
ALTER TABLE public.job_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view job leads" ON public.job_leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX job_leads_job_id_idx ON public.job_leads(job_id);