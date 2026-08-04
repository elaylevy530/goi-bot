
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_mime TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size BIGINT,
  ADD COLUMN IF NOT EXISTS attachment_kind TEXT,
  ADD COLUMN IF NOT EXISTS duration_ms INT;
