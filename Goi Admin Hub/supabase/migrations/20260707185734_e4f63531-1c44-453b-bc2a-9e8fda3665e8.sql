DO $$ BEGIN
  CREATE TYPE public.courier_kind AS ENUM ('courier','mover');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.couriers
  ADD COLUMN IF NOT EXISTS courier_kind public.courier_kind NOT NULL DEFAULT 'courier';

CREATE INDEX IF NOT EXISTS couriers_courier_kind_idx ON public.couriers(courier_kind);