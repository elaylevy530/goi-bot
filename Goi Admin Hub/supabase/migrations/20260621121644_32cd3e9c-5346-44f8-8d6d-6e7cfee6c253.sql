
CREATE TABLE public.admin_chat_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'שיחה חדשה',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_chat_threads_owner ON public.admin_chat_threads(owner_id, last_message_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_chat_threads TO authenticated;
GRANT ALL ON public.admin_chat_threads TO service_role;
ALTER TABLE public.admin_chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin owns threads — select"
  ON public.admin_chat_threads FOR SELECT TO authenticated
  USING (owner_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin owns threads — insert"
  ON public.admin_chat_threads FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin owns threads — update"
  ON public.admin_chat_threads FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin owns threads — delete"
  ON public.admin_chat_threads FOR DELETE TO authenticated
  USING (owner_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.admin_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.admin_chat_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  parts JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_chat_messages_thread ON public.admin_chat_messages(thread_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_chat_messages TO authenticated;
GRANT ALL ON public.admin_chat_messages TO service_role;
ALTER TABLE public.admin_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin reads messages of own threads"
  ON public.admin_chat_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_chat_threads t
    WHERE t.id = thread_id AND t.owner_id = auth.uid() AND public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Admin inserts messages to own threads"
  ON public.admin_chat_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_chat_threads t
    WHERE t.id = thread_id AND t.owner_id = auth.uid() AND public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Admin deletes messages of own threads"
  ON public.admin_chat_messages FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_chat_threads t
    WHERE t.id = thread_id AND t.owner_id = auth.uid() AND public.has_role(auth.uid(), 'admin')));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_admin_chat_threads_updated_at
  BEFORE UPDATE ON public.admin_chat_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
