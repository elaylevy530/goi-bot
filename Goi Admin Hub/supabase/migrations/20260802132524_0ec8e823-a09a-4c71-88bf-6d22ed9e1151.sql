CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  logo_url text,
  contact_phone text,
  whatsapp_group_id text,
  dispatch_note text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.partners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active partners"
ON public.partners FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins manage partners"
ON public.partners FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER partners_set_updated_at
BEFORE UPDATE ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.jobs ADD COLUMN partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;
CREATE INDEX idx_jobs_partner_id ON public.jobs(partner_id);

INSERT INTO public.partners (slug, name, contact_phone, dispatch_note)
VALUES ('aluf', 'אלוף ההובלות', NULL, 'הזמנה דרך שותף: אלוף ההובלות');