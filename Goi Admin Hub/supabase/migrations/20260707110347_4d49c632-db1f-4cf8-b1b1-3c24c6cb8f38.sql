
-- Goi Express (private guest orders) — additive only, no changes to existing courier/business data.

-- 1) Guest columns on jobs (nullable, don't touch existing rows)
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS guest_name text,
  ADD COLUMN IF NOT EXISTS guest_phone text,
  ADD COLUMN IF NOT EXISTS service_category text;

COMMENT ON COLUMN public.jobs.guest_name IS 'Goi Express: name of private (guest) customer';
COMMENT ON COLUMN public.jobs.guest_phone IS 'Goi Express: phone of private (guest) customer';
COMMENT ON COLUMN public.jobs.service_category IS 'Goi Express: same_day | scheduled | small_move | big_move';

-- 2) express_pricing_rules — admin-controlled per service category (kept separate from
-- the existing "pricing_rules" table used for legacy per-city pricing).
CREATE TABLE IF NOT EXISTS public.express_pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_category text NOT NULL UNIQUE,
  display_name text NOT NULL,
  payment_mode text NOT NULL DEFAULT 'cash_only',
  deposit_percent int NOT NULL DEFAULT 25,
  min_price numeric NOT NULL DEFAULT 0,
  base_price numeric NOT NULL DEFAULT 0,
  price_per_km numeric NOT NULL DEFAULT 0,
  allow_customer_quote boolean NOT NULL DEFAULT true,
  allow_customer_fixed_price boolean NOT NULL DEFAULT true,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.express_pricing_rules TO anon, authenticated;
GRANT ALL ON public.express_pricing_rules TO service_role;

ALTER TABLE public.express_pricing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "express_pricing_rules public read" ON public.express_pricing_rules;
CREATE POLICY "express_pricing_rules public read"
  ON public.express_pricing_rules FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "express_pricing_rules admin write" ON public.express_pricing_rules;
CREATE POLICY "express_pricing_rules admin write"
  ON public.express_pricing_rules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed the 4 service categories (idempotent)
INSERT INTO public.express_pricing_rules (service_category, display_name, payment_mode, deposit_percent, min_price, base_price, price_per_km, allow_customer_quote, allow_customer_fixed_price, notes)
VALUES
  ('same_day',   'משלוח מהיום להיום', 'deposit',      25, 35,  25,  3.5,  true, true,  'חבילה או מסמך — אופנוע/רכב'),
  ('scheduled',  'משלוח מתוזמן',      'deposit',      25, 35,  25,  3.5,  true, true,  'משלוח בזמן שנבחר מראש'),
  ('small_move', 'הובלה קטנה',        'deposit',      30, 90,  70,  6.0,  true, true,  'רהיט בודד, מקרר, ספה — רכב/טנדר'),
  ('big_move',   'הובלה גדולה',       'full_upfront',  0, 500, 350, 12.0, true, false, 'דירה/משרד — משאית + עובדים')
ON CONFLICT (service_category) DO NOTHING;

CREATE INDEX IF NOT EXISTS jobs_service_category_idx ON public.jobs (service_category) WHERE service_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS jobs_guest_phone_idx ON public.jobs (guest_phone) WHERE guest_phone IS NOT NULL;
