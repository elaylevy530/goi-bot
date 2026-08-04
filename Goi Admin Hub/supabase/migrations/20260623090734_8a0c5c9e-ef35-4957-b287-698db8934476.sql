-- Add 'delivered' to delivery status enum
ALTER TYPE message_delivery_status ADD VALUE IF NOT EXISTS 'delivered' BEFORE 'read';

-- Add tracking columns to whatsapp_messages
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS external_message_id text,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_status_at timestamptz,
  ADD COLUMN IF NOT EXISTS message_type text;

CREATE INDEX IF NOT EXISTS idx_wa_external_message_id
  ON public.whatsapp_messages(external_message_id)
  WHERE external_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wa_direction_created
  ON public.whatsapp_messages(direction, created_at DESC);