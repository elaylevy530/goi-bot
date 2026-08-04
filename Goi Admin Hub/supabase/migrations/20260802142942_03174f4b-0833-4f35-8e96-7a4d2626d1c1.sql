ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS message_sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS message_cta text;