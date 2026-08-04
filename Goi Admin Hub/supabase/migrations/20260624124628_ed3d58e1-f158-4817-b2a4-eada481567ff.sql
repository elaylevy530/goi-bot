-- 1. Extend business_niche enum with new values
DO $$ BEGIN
  ALTER TYPE business_niche ADD VALUE IF NOT EXISTS 'pharmacy_clinic';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE business_niche ADD VALUE IF NOT EXISTS 'integration_business';
EXCEPTION WHEN others THEN NULL; END $$;

-- 2. billing_cycle enum
DO $$ BEGIN
  CREATE TYPE billing_cycle AS ENUM ('per_delivery','daily','weekly','monthly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Extend customers with payment + dispatch gating columns
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS payment_method_on_file boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_method_last4 text,
  ADD COLUMN IF NOT EXISTS payment_method_brand text,
  ADD COLUMN IF NOT EXISTS payment_method_added_at timestamptz,
  ADD COLUMN IF NOT EXISTS billing_cycle billing_cycle NOT NULL DEFAULT 'per_delivery',
  ADD COLUMN IF NOT EXISTS dispatch_blocked_reason text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS business_tax_id text,
  ADD COLUMN IF NOT EXISTS operating_hours jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS service_areas text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS preferred_vehicle_types text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS default_pricing_type text DEFAULT 'distance_based',
  ADD COLUMN IF NOT EXISTS default_delivery_window_minutes integer DEFAULT 90,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean DEFAULT false;