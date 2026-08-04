-- 1. customers: account_mode
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS account_mode TEXT NOT NULL DEFAULT 'business'
    CHECK (account_mode IN ('private','business'));

-- 2. jobs: tip + recipient tracking token
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS tip_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS recipient_tracking_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(12),'hex');

-- 3. saved_contacts
CREATE TABLE IF NOT EXISTS public.saved_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  full_address TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_contacts TO authenticated;
GRANT ALL ON public.saved_contacts TO service_role;
ALTER TABLE public.saved_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business manages own contacts" ON public.saved_contacts
  FOR ALL TO authenticated
  USING (business_id = current_business_id())
  WITH CHECK (business_id = current_business_id());
CREATE POLICY "Admin manages contacts" ON public.saved_contacts
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_saved_contacts_updated_at BEFORE UPDATE ON public.saved_contacts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 4. delivery_templates
CREATE TABLE IF NOT EXISTS public.delivery_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_templates TO authenticated;
GRANT ALL ON public.delivery_templates TO service_role;
ALTER TABLE public.delivery_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business manages own templates" ON public.delivery_templates
  FOR ALL TO authenticated
  USING (business_id = current_business_id())
  WITH CHECK (business_id = current_business_id());
CREATE POLICY "Admin manages templates" ON public.delivery_templates
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_delivery_templates_updated_at BEFORE UPDATE ON public.delivery_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 5. notifications (per business)
CREATE TABLE IF NOT EXISTS public.business_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_biz_notif_business ON public.business_notifications(business_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_notifications TO authenticated;
GRANT ALL ON public.business_notifications TO service_role;
ALTER TABLE public.business_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business reads own notif" ON public.business_notifications
  FOR SELECT TO authenticated USING (business_id = current_business_id());
CREATE POLICY "Business marks own notif read" ON public.business_notifications
  FOR UPDATE TO authenticated USING (business_id = current_business_id()) WITH CHECK (business_id = current_business_id());
CREATE POLICY "Admin all notif" ON public.business_notifications
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 6. wallet_transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('topup','charge','refund','tip','bonus','coupon')),
  amount NUMERIC NOT NULL,
  balance_after NUMERIC,
  description TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_business ON public.wallet_transactions(business_id, created_at DESC);
GRANT SELECT, INSERT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business reads own wallet" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (business_id = current_business_id());
CREATE POLICY "Admin all wallet" ON public.wallet_transactions
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 7. coupons + redemptions
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent','amount','credit')),
  discount_value NUMERIC NOT NULL,
  max_redemptions INTEGER,
  per_user_limit INTEGER DEFAULT 1,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authed reads active coupons" ON public.coupons
  FOR SELECT TO authenticated USING (is_active = TRUE);
CREATE POLICY "Admin manages coupons" ON public.coupons
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  amount_applied NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, business_id, job_id)
);
GRANT SELECT, INSERT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business reads own redemptions" ON public.coupon_redemptions
  FOR SELECT TO authenticated USING (business_id = current_business_id());
CREATE POLICY "Business creates own redemption" ON public.coupon_redemptions
  FOR INSERT TO authenticated WITH CHECK (business_id = current_business_id());
CREATE POLICY "Admin all redemptions" ON public.coupon_redemptions
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 8. Public read for recipient tracking via token (anonymous, narrow)
CREATE POLICY "Public reads job by tracking token" ON public.jobs
  FOR SELECT TO anon, authenticated
  USING (recipient_tracking_token IS NOT NULL AND current_setting('request.headers', true)::jsonb->>'x-tracking-token' = recipient_tracking_token);
GRANT SELECT ON public.jobs TO anon;

-- 9. Helper: notify business
CREATE OR REPLACE FUNCTION public.notify_business(_business_id UUID, _job_id UUID, _kind TEXT, _title TEXT, _body TEXT DEFAULT NULL, _link TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _id UUID;
BEGIN
  INSERT INTO public.business_notifications (business_id, job_id, kind, title, body, link)
  VALUES (_business_id, _job_id, _kind, _title, _body, _link)
  RETURNING id INTO _id;
  RETURN _id;
END $$;

-- 10. Trigger: auto-notify business on job status changes
CREATE OR REPLACE FUNCTION public.tg_notify_business_on_job_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _link TEXT;
BEGIN
  IF NEW.customer_id IS NULL THEN RETURN NEW; END IF;
  _link := '/business/order/' || NEW.id::text;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_business(NEW.customer_id, NEW.id, 'job_created', 'הזמנה נשלחה', 'ההזמנה ' || COALESCE(NEW.job_number,'') || ' התקבלה במערכת', _link);
  ELSIF NEW.status::text IS DISTINCT FROM OLD.status::text THEN
    PERFORM public.notify_business(NEW.customer_id, NEW.id, 'status_change',
      'עדכון משלוח ' || COALESCE(NEW.job_number,''),
      'סטטוס חדש: ' || NEW.status::text, _link);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_business_on_job_change ON public.jobs;
CREATE TRIGGER trg_notify_business_on_job_change
  AFTER INSERT OR UPDATE OF status ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_business_on_job_change();