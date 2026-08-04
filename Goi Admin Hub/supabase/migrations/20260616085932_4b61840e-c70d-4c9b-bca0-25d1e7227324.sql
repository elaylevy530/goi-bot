
-- Add new vehicle option to enum
ALTER TYPE public.vehicle_type ADD VALUE IF NOT EXISTS 'קורקינט חשמלי';
ALTER TYPE public.vehicle_type ADD VALUE IF NOT EXISTS 'אופניים רגילים';

-- Add new columns to couriers
ALTER TABLE public.couriers
  ADD COLUMN IF NOT EXISTS vehicle_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS custom_work_area text,
  ADD COLUMN IF NOT EXISTS pickup_areas text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS custom_pickup_area text,
  ADD COLUMN IF NOT EXISTS dropoff_areas text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS custom_dropoff_area text,
  ADD COLUMN IF NOT EXISTS work_distance_from_base text,
  ADD COLUMN IF NOT EXISTS courier_experience_status text,
  ADD COLUMN IF NOT EXISTS courier_experience_duration text,
  ADD COLUMN IF NOT EXISTS consent_whatsapp boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS id_document_url text;

-- Backfill vehicle_types from existing single vehicle_type for any existing rows
UPDATE public.couriers
SET vehicle_types = ARRAY[vehicle_type::text]
WHERE vehicle_type IS NOT NULL AND (vehicle_types IS NULL OR array_length(vehicle_types,1) IS NULL);
