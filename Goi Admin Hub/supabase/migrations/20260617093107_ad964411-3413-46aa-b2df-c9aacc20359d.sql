CREATE TABLE public.courier_bonuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  icon TEXT NOT NULL DEFAULT 'Sparkles',
  color TEXT NOT NULL DEFAULT 'orange',
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.courier_bonuses TO authenticated;
GRANT ALL ON public.courier_bonuses TO service_role;

ALTER TABLE public.courier_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view bonuses"
  ON public.courier_bonuses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert bonuses"
  ON public.courier_bonuses FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bonuses"
  ON public.courier_bonuses FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bonuses"
  ON public.courier_bonuses FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_courier_bonuses_updated_at
  BEFORE UPDATE ON public.courier_bonuses
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_courier_bonuses_active ON public.courier_bonuses (is_active, sort_order);