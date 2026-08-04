
CREATE TABLE IF NOT EXISTS public.green_api_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_message_id text,
  type_webhook text,
  type_message text,
  sender_chat_id text,
  sender_phone text,
  button_id text,
  button_text text,
  raw_payload jsonb NOT NULL,
  processing_status text NOT NULL DEFAULT 'received',
  processing_error text,
  delivery_id uuid,
  courier_id uuid,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

GRANT SELECT ON public.green_api_webhook_events TO authenticated;
GRANT ALL ON public.green_api_webhook_events TO service_role;

ALTER TABLE public.green_api_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read webhook events"
  ON public.green_api_webhook_events FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_gawe_received_at ON public.green_api_webhook_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_gawe_external_message_id ON public.green_api_webhook_events(external_message_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_gawe_external_message_id ON public.green_api_webhook_events(external_message_id) WHERE external_message_id IS NOT NULL;
