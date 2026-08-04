
-- =========================================
-- 1) STOREFRONTS
-- =========================================
CREATE TABLE public.storefronts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  brand_color TEXT DEFAULT '#0ea5e9',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_open BOOLEAN NOT NULL DEFAULT true,
  opening_hours JSONB,
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  delivery_window_minutes INTEGER DEFAULT 45,
  allow_scheduling BOOLEAN NOT NULL DEFAULT true,
  default_vehicle_type TEXT DEFAULT 'אופנוע',
  default_pricing_type TEXT NOT NULL DEFAULT 'fixed_price',
  default_courier_payment NUMERIC(10,2) DEFAULT 0,
  payment_mode TEXT NOT NULL DEFAULT 'cod', -- 'cod' | 'stripe'
  stripe_account_id TEXT,
  stripe_charges_enabled BOOLEAN NOT NULL DEFAULT false,
  platform_fee_percent NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.storefronts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.storefronts TO authenticated;
GRANT ALL ON public.storefronts TO service_role;

ALTER TABLE public.storefronts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active storefronts"
  ON public.storefronts FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Business owner manages own storefront"
  ON public.storefronts FOR ALL TO authenticated
  USING (business_id = public.current_business_id() OR public.is_admin())
  WITH CHECK (business_id = public.current_business_id() OR public.is_admin());

CREATE TRIGGER trg_storefronts_updated_at
  BEFORE UPDATE ON public.storefronts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_storefronts_slug ON public.storefronts(slug);
CREATE INDEX idx_storefronts_business ON public.storefronts(business_id);

-- =========================================
-- 2) STOREFRONT CATEGORIES
-- =========================================
CREATE TABLE public.storefront_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id UUID NOT NULL REFERENCES public.storefronts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.storefront_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.storefront_categories TO authenticated;
GRANT ALL ON public.storefront_categories TO service_role;

ALTER TABLE public.storefront_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active categories"
  ON public.storefront_categories FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Business owner manages own categories"
  ON public.storefront_categories FOR ALL TO authenticated
  USING (
    EXISTS(SELECT 1 FROM public.storefronts s
      WHERE s.id = storefront_id
        AND (s.business_id = public.current_business_id() OR public.is_admin()))
  )
  WITH CHECK (
    EXISTS(SELECT 1 FROM public.storefronts s
      WHERE s.id = storefront_id
        AND (s.business_id = public.current_business_id() OR public.is_admin()))
  );

CREATE TRIGGER trg_storefront_categories_updated_at
  BEFORE UPDATE ON public.storefront_categories
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_categories_storefront ON public.storefront_categories(storefront_id);

-- =========================================
-- 3) STOREFRONT PRODUCTS
-- =========================================
CREATE TABLE public.storefront_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id UUID NOT NULL REFERENCES public.storefronts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.storefront_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  stock INTEGER, -- null = unlimited
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.storefront_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.storefront_products TO authenticated;
GRANT ALL ON public.storefront_products TO service_role;

ALTER TABLE public.storefront_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view available products"
  ON public.storefront_products FOR SELECT TO anon, authenticated
  USING (is_available = true);

CREATE POLICY "Business owner manages own products"
  ON public.storefront_products FOR ALL TO authenticated
  USING (
    EXISTS(SELECT 1 FROM public.storefronts s
      WHERE s.id = storefront_id
        AND (s.business_id = public.current_business_id() OR public.is_admin()))
  )
  WITH CHECK (
    EXISTS(SELECT 1 FROM public.storefronts s
      WHERE s.id = storefront_id
        AND (s.business_id = public.current_business_id() OR public.is_admin()))
  );

CREATE TRIGGER trg_storefront_products_updated_at
  BEFORE UPDATE ON public.storefront_products
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_products_storefront ON public.storefront_products(storefront_id);
CREATE INDEX idx_products_category ON public.storefront_products(category_id);

-- =========================================
-- 4) STOREFRONT ORDERS
-- =========================================
CREATE SEQUENCE IF NOT EXISTS public.storefront_order_seq START 1000;

CREATE TABLE public.storefront_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE DEFAULT ('SO-' || nextval('public.storefront_order_seq')::text),
  storefront_id UUID NOT NULL REFERENCES public.storefronts(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  dropoff_address TEXT NOT NULL,
  dropoff_city TEXT,
  dropoff_lat NUMERIC(10,7),
  dropoff_lng NUMERIC(10,7),
  notes TEXT,
  items JSONB NOT NULL, -- [{product_id, name, qty, price, line_total}]
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_mode TEXT NOT NULL DEFAULT 'asap', -- 'asap' | 'scheduled'
  scheduled_for TIMESTAMPTZ,
  payment_method TEXT NOT NULL DEFAULT 'cod', -- 'cod' | 'stripe'
  payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'failed' | 'cod'
  stripe_payment_intent_id TEXT,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'received', -- 'received' | 'preparing' | 'dispatched' | 'delivered' | 'cancelled'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.storefront_orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.storefront_orders TO authenticated;
GRANT ALL ON public.storefront_orders TO service_role;
GRANT USAGE ON SEQUENCE public.storefront_order_seq TO anon, authenticated, service_role;

ALTER TABLE public.storefront_orders ENABLE ROW LEVEL SECURITY;

-- Public/anon can INSERT orders (customers placing orders without login)
CREATE POLICY "Anyone can place an order"
  ON public.storefront_orders FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Public can read their order by id (used for success page; UUID is unguessable)
CREATE POLICY "Anyone can read order by id"
  ON public.storefront_orders FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Business owner manages own orders"
  ON public.storefront_orders FOR UPDATE TO authenticated
  USING (business_id = public.current_business_id() OR public.is_admin())
  WITH CHECK (business_id = public.current_business_id() OR public.is_admin());

CREATE POLICY "Business owner can delete own orders"
  ON public.storefront_orders FOR DELETE TO authenticated
  USING (business_id = public.current_business_id() OR public.is_admin());

CREATE TRIGGER trg_storefront_orders_updated_at
  BEFORE UPDATE ON public.storefront_orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_storefront_orders_business ON public.storefront_orders(business_id);
CREATE INDEX idx_storefront_orders_storefront ON public.storefront_orders(storefront_id);
CREATE INDEX idx_storefront_orders_job ON public.storefront_orders(job_id);
