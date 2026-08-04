
-- 1. Extend customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS business_hours text,
  ADD COLUMN IF NOT EXISTS default_delivery_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS permanent_courier_notes text;

-- 2. Extend jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS pickup_branch_id uuid,
  ADD COLUMN IF NOT EXISTS pickup_contact_name text,
  ADD COLUMN IF NOT EXISTS pickup_contact_phone text,
  ADD COLUMN IF NOT EXISTS pickup_notes text,
  ADD COLUMN IF NOT EXISTS recipient_name text,
  ADD COLUMN IF NOT EXISTS recipient_phone text,
  ADD COLUMN IF NOT EXISTS dropoff_notes text,
  ADD COLUMN IF NOT EXISTS package_type text,
  ADD COLUMN IF NOT EXISTS package_size text,
  ADD COLUMN IF NOT EXISTS fragile boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS number_of_packages integer,
  ADD COLUMN IF NOT EXISTS delivery_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS matching_model text,
  ADD COLUMN IF NOT EXISTS suggested_courier_payment numeric(10,2),
  ADD COLUMN IF NOT EXISTS customer_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS platform_fee numeric(10,2);

-- 3. business_branches
CREATE TABLE IF NOT EXISTS public.business_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  branch_name text NOT NULL,
  city text,
  full_address text,
  contact_person text,
  phone text,
  courier_notes text,
  business_hours text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_branches TO authenticated;
GRANT ALL ON public.business_branches TO service_role;
ALTER TABLE public.business_branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business manages own branches" ON public.business_branches
  FOR ALL TO authenticated
  USING (business_id = public.current_business_id() OR public.is_admin())
  WITH CHECK (business_id = public.current_business_id() OR public.is_admin());
CREATE TRIGGER trg_branches_updated BEFORE UPDATE ON public.business_branches
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Add jobs.pickup_branch_id FK
DO $$ BEGIN
  ALTER TABLE public.jobs ADD CONSTRAINT jobs_pickup_branch_id_fkey
    FOREIGN KEY (pickup_branch_id) REFERENCES public.business_branches(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. business_favorite_couriers
CREATE TABLE IF NOT EXISTS public.business_favorite_couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  courier_id uuid NOT NULL REFERENCES public.couriers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'preferred' CHECK (status IN ('preferred','blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, courier_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_favorite_couriers TO authenticated;
GRANT ALL ON public.business_favorite_couriers TO service_role;
ALTER TABLE public.business_favorite_couriers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business manages own favorites" ON public.business_favorite_couriers
  FOR ALL TO authenticated
  USING (business_id = public.current_business_id() OR public.is_admin())
  WITH CHECK (business_id = public.current_business_id() OR public.is_admin());

-- 5. business_recurring_orders
CREATE TABLE IF NOT EXISTS public.business_recurring_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  recurrence_type text NOT NULL,
  days_of_week int[] DEFAULT '{}',
  start_time time,
  end_time time,
  branch_id uuid REFERENCES public.business_branches(id) ON DELETE SET NULL,
  pickup_address text,
  dropoff_address text,
  payment numeric(10,2),
  couriers_needed int DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_recurring_orders TO authenticated;
GRANT ALL ON public.business_recurring_orders TO service_role;
ALTER TABLE public.business_recurring_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business manages own recurring" ON public.business_recurring_orders
  FOR ALL TO authenticated
  USING (business_id = public.current_business_id() OR public.is_admin())
  WITH CHECK (business_id = public.current_business_id() OR public.is_admin());
CREATE TRIGGER trg_recurring_updated BEFORE UPDATE ON public.business_recurring_orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 6. billing_records
CREATE TABLE IF NOT EXISTS public.billing_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  customer_price numeric(10,2) NOT NULL DEFAULT 0,
  courier_payment numeric(10,2) NOT NULL DEFAULT 0,
  platform_fee numeric(10,2) NOT NULL DEFAULT 0,
  billing_status text NOT NULL DEFAULT 'pending' CHECK (billing_status IN ('pending','open','paid','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_records TO authenticated;
GRANT ALL ON public.billing_records TO service_role;
ALTER TABLE public.billing_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business reads own billing" ON public.billing_records
  FOR SELECT TO authenticated
  USING (business_id = public.current_business_id() OR public.is_admin());
CREATE POLICY "Admins manage billing" ON public.billing_records
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_billing_updated BEFORE UPDATE ON public.billing_records
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 7. support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  issue_type text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business manages own tickets" ON public.support_tickets
  FOR ALL TO authenticated
  USING (business_id = public.current_business_id() OR public.is_admin())
  WITH CHECK (business_id = public.current_business_id() OR public.is_admin());
CREATE TRIGGER trg_tickets_updated BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 8. Auto-create billing_record when job completed
CREATE OR REPLACE FUNCTION public.tg_create_billing_on_complete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status::text = 'הושלמה' AND OLD.status::text IS DISTINCT FROM 'הושלמה' AND NEW.customer_id IS NOT NULL THEN
    INSERT INTO public.billing_records (business_id, job_id, customer_price, courier_payment, platform_fee, billing_status)
    VALUES (
      NEW.customer_id,
      NEW.id,
      COALESCE(NEW.customer_price, NEW.final_price, NEW.payment, 0),
      COALESCE(NEW.payment, 0),
      COALESCE(NEW.platform_fee, 0),
      'open'
    )
    ON CONFLICT (job_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_jobs_billing ON public.jobs;
CREATE TRIGGER trg_jobs_billing AFTER UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.tg_create_billing_on_complete();
