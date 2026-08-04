
-- =============================================================================
-- Chat lifecycle: auto-delete per-job chat on completion + push notifications
-- =============================================================================

-- 1) Push subscription tables for business + customer (mirror courier's shape)
CREATE TABLE IF NOT EXISTS public.business_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_push_subscriptions TO authenticated;
GRANT ALL ON public.business_push_subscriptions TO service_role;
ALTER TABLE public.business_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business reads own push subs" ON public.business_push_subscriptions
  FOR SELECT USING (business_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));
CREATE POLICY "business inserts own push subs" ON public.business_push_subscriptions
  FOR INSERT WITH CHECK (business_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));
CREATE POLICY "business deletes own push subs" ON public.business_push_subscriptions
  FOR DELETE USING (business_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_business_push_subs_business ON public.business_push_subscriptions(business_id);


CREATE TABLE IF NOT EXISTS public.customer_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_push_subscriptions TO authenticated;
GRANT ALL ON public.customer_push_subscriptions TO service_role;
ALTER TABLE public.customer_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer reads own push subs" ON public.customer_push_subscriptions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "customer inserts own push subs" ON public.customer_push_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "customer deletes own push subs" ON public.customer_push_subscriptions
  FOR DELETE USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_customer_push_subs_user ON public.customer_push_subscriptions(user_id);


-- 2) app_config table for storing runtime settings (e.g. secrets consumed by DB triggers)
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.app_config TO service_role;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated/anon — only service_role can read (bypass RLS).


-- 3) Auto-delete per-job chats when the job reaches a terminal state.
--    Support conversations (courier_support, business_support) are NEVER touched.
CREATE OR REPLACE FUNCTION public.tg_delete_chat_on_job_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status::text IN ('הושלמה','בוטלה')
     AND OLD.status::text IS DISTINCT FROM NEW.status::text THEN
    -- Delete business↔courier conversation for this job (messages cascade via FK)
    DELETE FROM public.conversations
    WHERE kind = 'courier_business'
      AND job_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_chat_on_job_completion ON public.jobs;
CREATE TRIGGER trg_delete_chat_on_job_completion
AFTER UPDATE OF status ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.tg_delete_chat_on_job_completion();


-- 4) Push notify: on new message in a courier↔business conversation, POST to our
--    public webhook so it can dispatch web-push to the recipient.
CREATE OR REPLACE FUNCTION public.tg_notify_chat_message_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions'
AS $$
DECLARE
  _base TEXT;
  _secret TEXT;
BEGIN
  SELECT value INTO _base FROM public.app_config WHERE key = 'chat_push_url';
  SELECT value INTO _secret FROM public.app_config WHERE key = 'chat_push_secret';
  IF _base IS NULL OR _secret IS NULL THEN
    RETURN NEW; -- not configured yet; silently skip
  END IF;

  PERFORM net.http_post(
    url := _base,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _secret
    ),
    body := jsonb_build_object(
      'kind', 'conversation_message',
      'message_id', NEW.id,
      'conversation_id', NEW.conversation_id,
      'sender_role', NEW.sender_role,
      'body_preview', LEFT(COALESCE(NEW.body, '📎 קובץ'), 100)
    ),
    timeout_milliseconds := 3000
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never break the insert on push failure
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_chat_message_push ON public.messages;
CREATE TRIGGER trg_notify_chat_message_push
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_chat_message_push();


-- 5) One-time cleanup: remove per-job chats for jobs already finished before
--    the trigger was installed, so the app starts clean.
DELETE FROM public.conversations c
WHERE c.kind = 'courier_business'
  AND c.job_id IN (
    SELECT id FROM public.jobs
    WHERE status::text IN ('הושלמה','בוטלה')
  );
