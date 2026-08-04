
-- Extend customers with PayPal vault fields
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS paypal_vault_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_payer_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_email TEXT,
  ADD COLUMN IF NOT EXISTS paypal_setup_at TIMESTAMPTZ;

-- Extend billing_records
ALTER TABLE public.billing_records
  ADD COLUMN IF NOT EXISTS paypal_order_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_capture_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_payout_batch_id TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_billing_paypal_order ON public.billing_records(paypal_order_id) WHERE paypal_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_billing_paypal_capture ON public.billing_records(paypal_capture_id) WHERE paypal_capture_id IS NOT NULL;

-- Webhook events log (idempotency)
CREATE TABLE IF NOT EXISTS public.paypal_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  payload JSONB NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_paypal_webhook_type ON public.paypal_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_paypal_webhook_resource ON public.paypal_webhook_events(resource_id);

GRANT ALL ON public.paypal_webhook_events TO service_role;
ALTER TABLE public.paypal_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read paypal webhooks" ON public.paypal_webhook_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Payouts to couriers
CREATE TABLE IF NOT EXISTS public.paypal_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL,
  withdrawal_request_id UUID REFERENCES public.withdrawal_requests(id) ON DELETE SET NULL,
  paypal_batch_id TEXT,
  paypal_payout_item_id TEXT,
  recipient_email TEXT NOT NULL,
  amount_ils NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ILS',
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sender_batch_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_paypal_payouts_courier ON public.paypal_payouts(courier_id);
CREATE INDEX IF NOT EXISTS idx_paypal_payouts_batch ON public.paypal_payouts(paypal_batch_id);

GRANT SELECT ON public.paypal_payouts TO authenticated;
GRANT ALL ON public.paypal_payouts TO service_role;
ALTER TABLE public.paypal_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couriers see their own payouts" ON public.paypal_payouts
  FOR SELECT TO authenticated
  USING (
    courier_id IN (SELECT id FROM public.couriers WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE OR REPLACE FUNCTION public.touch_paypal_payouts() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_touch_paypal_payouts ON public.paypal_payouts;
CREATE TRIGGER trg_touch_paypal_payouts BEFORE UPDATE ON public.paypal_payouts
  FOR EACH ROW EXECUTE FUNCTION public.touch_paypal_payouts();
