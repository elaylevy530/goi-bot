-- ============ KIOSKS ============
CREATE TABLE public.kiosks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  lat NUMERIC,
  lng NUMERIC,
  image_url TEXT,
  rating NUMERIC DEFAULT 4.5,
  rating_count INTEGER DEFAULT 0,
  is_open BOOLEAN NOT NULL DEFAULT true,
  hours TEXT,
  delivery_fee_default NUMERIC NOT NULL DEFAULT 15,
  service_fee_default NUMERIC NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.kiosks TO anon, authenticated;
GRANT ALL ON public.kiosks TO service_role;
ALTER TABLE public.kiosks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kiosks public read" ON public.kiosks FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "kiosks admin all" ON public.kiosks FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER kiosks_updated_at BEFORE UPDATE ON public.kiosks FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ CATEGORIES ============
CREATE TABLE public.kiosk_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kiosk_id UUID REFERENCES public.kiosks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.kiosk_categories TO anon, authenticated;
GRANT ALL ON public.kiosk_categories TO service_role;
ALTER TABLE public.kiosk_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.kiosk_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "categories admin all" ON public.kiosk_categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER kiosk_categories_updated_at BEFORE UPDATE ON public.kiosk_categories FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ PRODUCTS ============
CREATE TABLE public.kiosk_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kiosk_id UUID NOT NULL REFERENCES public.kiosks(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.kiosk_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  unit TEXT,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX kiosk_products_kiosk_idx ON public.kiosk_products(kiosk_id);
CREATE INDEX kiosk_products_category_idx ON public.kiosk_products(category_id);
GRANT SELECT ON public.kiosk_products TO anon, authenticated;
GRANT ALL ON public.kiosk_products TO service_role;
ALTER TABLE public.kiosk_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.kiosk_products FOR SELECT TO anon, authenticated USING (is_available = true);
CREATE POLICY "products admin all" ON public.kiosk_products FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER kiosk_products_updated_at BEFORE UPDATE ON public.kiosk_products FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ MUNCH ORDERS ============
CREATE TABLE public.munch_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  guest_phone TEXT,
  guest_name TEXT,
  kiosk_id UUID NOT NULL REFERENCES public.kiosks(id) ON DELETE RESTRICT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  service_fee NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  dropoff_address TEXT NOT NULL,
  dropoff_lat NUMERIC,
  dropoff_lng NUMERIC,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX munch_orders_user_idx ON public.munch_orders(user_id);
CREATE INDEX munch_orders_job_idx ON public.munch_orders(job_id);
GRANT SELECT, INSERT, UPDATE ON public.munch_orders TO authenticated;
GRANT ALL ON public.munch_orders TO service_role;
ALTER TABLE public.munch_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "munch orders own read" ON public.munch_orders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "munch orders own insert" ON public.munch_orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "munch orders own update" ON public.munch_orders FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "munch orders admin all" ON public.munch_orders FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER munch_orders_updated_at BEFORE UPDATE ON public.munch_orders FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ SEED KIOSKS ============
INSERT INTO public.kiosks (id, name, address, city, lat, lng, image_url, rating, rating_count, is_open, hours, delivery_fee_default, service_fee_default) VALUES
  ('11111111-1111-1111-1111-111111111111', 'קיוסק דיזנגוף סנטר', 'דיזנגוף 50, תל אביב', 'תל אביב', 32.0757, 34.7748, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400', 4.8, 128, true, '24/7', 15, 3),
  ('22222222-2222-2222-2222-222222222222', 'קיוסק רוטשילד', 'שדרות רוטשילד 22, תל אביב', 'תל אביב', 32.0631, 34.7716, 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400', 4.6, 96, true, '06:00-02:00', 15, 3),
  ('33333333-3333-3333-3333-333333333333', 'קיוסק שוק הכרמל', 'הכרמל 11, תל אביב', 'תל אביב', 32.0687, 34.7691, 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400', 4.5, 78, true, '07:00-24:00', 18, 3),
  ('44444444-4444-4444-4444-444444444444', 'קיוסק עזריאלי', 'דרך מנחם בגין 132, תל אביב', 'תל אביב', 32.0741, 34.7920, 'https://images.unsplash.com/photo-1580913428023-02c695666d61?w=400', 4.4, 64, true, '08:00-23:00', 20, 3);

-- ============ SEED CATEGORIES (global — kiosk_id NULL means shown across all kiosks) ============
INSERT INTO public.kiosk_categories (id, kiosk_id, name, icon, sort_order) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', NULL, 'שתייה', '🥤', 1),
  ('aaaaaaaa-0000-0000-0000-000000000002', NULL, 'חטיפים', '🍿', 2),
  ('aaaaaaaa-0000-0000-0000-000000000003', NULL, 'מתוקים', '🍫', 3),
  ('aaaaaaaa-0000-0000-0000-000000000004', NULL, 'גלידות', '🍦', 4),
  ('aaaaaaaa-0000-0000-0000-000000000005', NULL, 'מוצרי קיוסק', '🚬', 5);

-- ============ SEED PRODUCTS — same catalog for each kiosk ============
INSERT INTO public.kiosk_products (kiosk_id, category_id, name, description, price, unit, image_url, sort_order)
SELECT k.id, p.category_id, p.name, p.description, p.price, p.unit, p.image_url, p.sort_order
FROM public.kiosks k,
(VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'קוקה-קולה',         'קלאסי',            7.00, '330 מ"ל', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=200', 1),
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'ספרייט',            'לימון-ליים',       7.00, '330 מ"ל', 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=200', 2),
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'מי עדן',            'מים מינרלים',      5.00, '500 מ"ל', 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=200', 3),
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'רד בול',            'משקה אנרגיה',     14.00, '250 מ"ל', 'https://images.unsplash.com/photo-1613410295850-4f0f7cffb28d?w=200', 4),
  ('aaaaaaaa-0000-0000-0000-000000000002'::uuid, 'דוריטוס גבינה',     'צ׳יפס תירס',       9.00, '100 גרם', 'https://images.unsplash.com/photo-1600952841320-db92ec4047ca?w=200', 1),
  ('aaaaaaaa-0000-0000-0000-000000000002'::uuid, 'במבה בוטנים',       'קלאסי אסם',        6.00, '80 גרם',  'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=200', 2),
  ('aaaaaaaa-0000-0000-0000-000000000002'::uuid, 'ביסלי גריל',        'קלאסי אסם',        6.00, '70 גרם',  'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=200', 3),
  ('aaaaaaaa-0000-0000-0000-000000000003'::uuid, 'מגנום שקולד מריר',  'ארטיק פרימיום',   12.00, '110 מ"ל', 'https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?w=200', 1),
  ('aaaaaaaa-0000-0000-0000-000000000003'::uuid, 'קינדר בואנו',       'שוקולד וופל',      6.00, '43 גרם',  'https://images.unsplash.com/photo-1600323878948-84cddaa0f0bc?w=200', 2),
  ('aaaaaaaa-0000-0000-0000-000000000003'::uuid, 'אורביט מנטה',       'מסטיק ללא סוכר',   5.00, '14 גרם',  'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=200', 3),
  ('aaaaaaaa-0000-0000-0000-000000000004'::uuid, 'קרטיב פטל',         'קרטיב פירות',      6.00, '80 מ"ל',  'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=200', 1),
  ('aaaaaaaa-0000-0000-0000-000000000005'::uuid, 'סוללות אנרג׳יזר AAA','4 יחידות',       10.00, '4 יח׳',   'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=200', 1),
  ('aaaaaaaa-0000-0000-0000-000000000005'::uuid, 'מצית BIC',          'מצית קלאסי',       5.00, '1 יח׳',   'https://images.unsplash.com/photo-1585951237318-9ea5e175b891?w=200', 2),
  ('aaaaaaaa-0000-0000-0000-000000000005'::uuid, 'ממחטות קליניקס',    '10 יחידות',        6.00, '10 יח׳',  'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=200', 3)
) AS p(category_id, name, description, price, unit, image_url, sort_order);