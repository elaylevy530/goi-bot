CREATE TABLE public.courier_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id uuid NOT NULL REFERENCES public.couriers(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.courier_push_subscriptions TO authenticated;
GRANT ALL ON public.courier_push_subscriptions TO service_role;

ALTER TABLE public.courier_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courier reads own push subs"
  ON public.courier_push_subscriptions FOR SELECT TO authenticated
  USING (courier_id IN (SELECT id FROM public.couriers WHERE user_id = auth.uid()));

CREATE POLICY "courier inserts own push subs"
  ON public.courier_push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (courier_id IN (SELECT id FROM public.couriers WHERE user_id = auth.uid()));

CREATE POLICY "courier deletes own push subs"
  ON public.courier_push_subscriptions FOR DELETE TO authenticated
  USING (courier_id IN (SELECT id FROM public.couriers WHERE user_id = auth.uid()));

CREATE INDEX idx_push_subs_courier ON public.courier_push_subscriptions(courier_id);