
-- Recipient WhatsApp notification preferences + per-job watchdog overrides

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS notify_recipient_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS notify_recipient boolean,
  ADD COLUMN IF NOT EXISTS pickup_watchdog_enabled boolean,
  ADD COLUMN IF NOT EXISTS pickup_reminder_minutes integer,
  ADD COLUMN IF NOT EXISTS pickup_redispatch_minutes integer;
