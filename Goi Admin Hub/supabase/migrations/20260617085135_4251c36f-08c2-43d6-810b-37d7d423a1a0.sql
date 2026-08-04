
-- Conversation kinds
DO $$ BEGIN
  CREATE TYPE public.conversation_kind AS ENUM ('courier_support','business_support','courier_business');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sender_role AS ENUM ('courier','business','admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.conversation_kind NOT NULL,
  courier_id uuid REFERENCES public.couriers(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  subject text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  unread_courier int NOT NULL DEFAULT 0,
  unread_business int NOT NULL DEFAULT 0,
  unread_admin int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS conversations_courier_support_uq
  ON public.conversations(courier_id) WHERE kind = 'courier_support';
CREATE UNIQUE INDEX IF NOT EXISTS conversations_business_support_uq
  ON public.conversations(business_id) WHERE kind = 'business_support';
CREATE UNIQUE INDEX IF NOT EXISTS conversations_courier_business_uq
  ON public.conversations(courier_id, business_id, job_id) WHERE kind = 'courier_business';

CREATE INDEX IF NOT EXISTS conversations_courier_idx ON public.conversations(courier_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS conversations_business_idx ON public.conversations(business_id, last_message_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv: participant or admin can read" ON public.conversations
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR (courier_id IS NOT NULL AND courier_id = public.current_courier_id())
  OR (business_id IS NOT NULL AND business_id = public.current_business_id())
);

CREATE POLICY "conv: participant or admin can insert" ON public.conversations
FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR (courier_id IS NOT NULL AND courier_id = public.current_courier_id())
  OR (business_id IS NOT NULL AND business_id = public.current_business_id())
);

CREATE POLICY "conv: participant or admin can update" ON public.conversations
FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR (courier_id IS NOT NULL AND courier_id = public.current_courier_id())
  OR (business_id IS NOT NULL AND business_id = public.current_business_id())
);

-- messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL,
  sender_role public.sender_role NOT NULL,
  body text,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conv_idx ON public.messages(conversation_id, created_at);

GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "msg: participant or admin can read" ON public.messages
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (
    public.has_role(auth.uid(),'admin')
    OR (c.courier_id IS NOT NULL AND c.courier_id = public.current_courier_id())
    OR (c.business_id IS NOT NULL AND c.business_id = public.current_business_id())
  ))
);

CREATE POLICY "msg: participant or admin can insert" ON public.messages
FOR INSERT TO authenticated WITH CHECK (
  sender_user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (
    public.has_role(auth.uid(),'admin')
    OR (c.courier_id IS NOT NULL AND c.courier_id = public.current_courier_id())
    OR (c.business_id IS NOT NULL AND c.business_id = public.current_business_id())
  ))
);

-- Trigger: update conversation on new message
CREATE OR REPLACE FUNCTION public.tg_messages_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
    SET last_message_at = NEW.created_at,
        last_message_preview = LEFT(COALESCE(NEW.body, CASE WHEN NEW.attachment_url IS NOT NULL THEN '📎 תמונה' ELSE '' END), 140),
        updated_at = now(),
        unread_courier = CASE WHEN NEW.sender_role <> 'courier' THEN unread_courier + 1 ELSE unread_courier END,
        unread_business = CASE WHEN NEW.sender_role <> 'business' THEN unread_business + 1 ELSE unread_business END,
        unread_admin = CASE WHEN NEW.sender_role <> 'admin' THEN unread_admin + 1 ELSE unread_admin END
    WHERE id = NEW.conversation_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS messages_after_insert ON public.messages;
CREATE TRIGGER messages_after_insert
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.tg_messages_after_insert();

-- updated_at trigger on conversations
DROP TRIGGER IF EXISTS conversations_set_updated_at ON public.conversations;
CREATE TRIGGER conversations_set_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- RPC: open or create a conversation
CREATE OR REPLACE FUNCTION public.open_conversation(
  _kind text,
  _courier_id uuid DEFAULT NULL,
  _business_id uuid DEFAULT NULL,
  _job_id uuid DEFAULT NULL,
  _subject text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cid uuid;
  _bid uuid;
  _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    _cid := public.current_courier_id();
    _bid := public.current_business_id();
  ELSE
    _cid := _courier_id;
    _bid := _business_id;
  END IF;

  IF _kind = 'courier_support' THEN
    IF _cid IS NULL THEN _cid := _courier_id; END IF;
    IF _cid IS NULL THEN RAISE EXCEPTION 'courier_id required'; END IF;
    SELECT id INTO _id FROM public.conversations WHERE kind='courier_support' AND courier_id=_cid;
    IF _id IS NULL THEN
      INSERT INTO public.conversations(kind, courier_id, subject) VALUES ('courier_support', _cid, COALESCE(_subject,'תמיכה'))
      RETURNING id INTO _id;
    END IF;
  ELSIF _kind = 'business_support' THEN
    IF _bid IS NULL THEN _bid := _business_id; END IF;
    IF _bid IS NULL THEN RAISE EXCEPTION 'business_id required'; END IF;
    SELECT id INTO _id FROM public.conversations WHERE kind='business_support' AND business_id=_bid;
    IF _id IS NULL THEN
      INSERT INTO public.conversations(kind, business_id, subject) VALUES ('business_support', _bid, COALESCE(_subject,'תמיכה'))
      RETURNING id INTO _id;
    END IF;
  ELSIF _kind = 'courier_business' THEN
    IF _cid IS NULL THEN _cid := _courier_id; END IF;
    IF _bid IS NULL OR _job_id IS NULL THEN RAISE EXCEPTION 'business_id and job_id required'; END IF;
    SELECT id INTO _id FROM public.conversations
      WHERE kind='courier_business' AND courier_id=_cid AND business_id=_bid AND job_id=_job_id;
    IF _id IS NULL THEN
      INSERT INTO public.conversations(kind, courier_id, business_id, job_id, subject)
      VALUES ('courier_business', _cid, _bid, _job_id, COALESCE(_subject,'משלוח'))
      RETURNING id INTO _id;
    END IF;
  ELSE
    RAISE EXCEPTION 'invalid kind: %', _kind;
  END IF;

  RETURN _id;
END $$;

-- RPC: mark read for current viewer
CREATE OR REPLACE FUNCTION public.mark_conversation_read(_conversation_id uuid, _role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _role = 'courier' THEN
    UPDATE public.conversations SET unread_courier = 0 WHERE id = _conversation_id;
  ELSIF _role = 'business' THEN
    UPDATE public.conversations SET unread_business = 0 WHERE id = _conversation_id;
  ELSIF _role = 'admin' THEN
    UPDATE public.conversations SET unread_admin = 0 WHERE id = _conversation_id;
  END IF;
END $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
