ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'business';

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS last_temp_password text,
  ADD COLUMN IF NOT EXISTS password_set_at timestamptz;