CREATE TABLE public.courier_contact_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT,
  source TEXT DEFAULT 'couriers_footer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.courier_contact_leads TO anon, authenticated;
GRANT ALL ON public.courier_contact_leads TO service_role;
ALTER TABLE public.courier_contact_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a lead" ON public.courier_contact_leads FOR INSERT TO anon, authenticated WITH CHECK (
  char_length(name) BETWEEN 1 AND 100
  AND char_length(phone) BETWEEN 6 AND 20
  AND (message IS NULL OR char_length(message) <= 1000)
);
CREATE POLICY "Admins can view leads" ON public.courier_contact_leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));