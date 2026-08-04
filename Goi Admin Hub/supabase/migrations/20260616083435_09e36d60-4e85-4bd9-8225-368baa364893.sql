
ALTER TABLE public.couriers
  ADD COLUMN IF NOT EXISTS delivery_bag text,
  ADD COLUMN IF NOT EXISTS max_distance text,
  ADD COLUMN IF NOT EXISTS vehicle_label text;
