ALTER TABLE public.couriers
  ADD COLUMN IF NOT EXISTS last_temp_password text,
  ADD COLUMN IF NOT EXISTS password_set_at timestamptz;