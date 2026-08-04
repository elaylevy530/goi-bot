
DO $$ BEGIN
  CREATE TYPE public.bot_template_category AS ENUM (
    'delivery_stage','courier_command','system_error',
    'business_notification','customer_notification','general'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend message_audience enum to include business
DO $$ BEGIN
  ALTER TYPE public.message_audience ADD VALUE IF NOT EXISTS 'business';
EXCEPTION WHEN others THEN NULL; END $$;

ALTER TABLE public.bot_templates
  ADD COLUMN IF NOT EXISTS template_key text,
  ADD COLUMN IF NOT EXISTS category public.bot_template_category NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS trigger_event text,
  ADD COLUMN IF NOT EXISTS buttons jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS footer text,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

UPDATE public.bot_templates
   SET template_key = lower(regexp_replace(template_name, '\s+', '_', 'g'))
 WHERE template_key IS NULL;
ALTER TABLE public.bot_templates ALTER COLUMN template_key SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS bot_templates_template_key_uniq ON public.bot_templates (template_key);

CREATE TABLE IF NOT EXISTS public.bot_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.bot_templates(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  version integer NOT NULL,
  message_body text,
  buttons jsonb NOT NULL DEFAULT '[]'::jsonb,
  footer text,
  is_active boolean NOT NULL DEFAULT true,
  edited_by uuid,
  edit_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_btv_template_created ON public.bot_template_versions (template_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_template_versions TO authenticated;
GRANT ALL ON public.bot_template_versions TO service_role;
ALTER TABLE public.bot_template_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage template versions" ON public.bot_template_versions;
CREATE POLICY "admins manage template versions" ON public.bot_template_versions
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.bot_ai_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL UNIQUE DEFAULT 'global',
  system_prompt text NOT NULL DEFAULT 'אתה הבוט של GOI — מערכת שילוח חכמה. ענה בעברית, קצר וברור. עזור לשליח עם זמינות, סטטוס משלוח, ארנק, ניווט ופניות תמיכה.',
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  temperature numeric NOT NULL DEFAULT 0.3,
  ai_enabled boolean NOT NULL DEFAULT true,
  knowledge_base text DEFAULT '',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.bot_ai_config (scope) VALUES ('global') ON CONFLICT (scope) DO NOTHING;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_ai_config TO authenticated;
GRANT ALL ON public.bot_ai_config TO service_role;
ALTER TABLE public.bot_ai_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage bot ai config" ON public.bot_ai_config;
CREATE POLICY "admins manage bot ai config" ON public.bot_ai_config
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.bot_training_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audience text NOT NULL DEFAULT 'courier',
  user_message text NOT NULL,
  expected_reply text NOT NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bte_audience_active ON public.bot_training_examples (audience, is_active);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_training_examples TO authenticated;
GRANT ALL ON public.bot_training_examples TO service_role;
ALTER TABLE public.bot_training_examples ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage training examples" ON public.bot_training_examples;
CREATE POLICY "admins manage training examples" ON public.bot_training_examples
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.bot_conversation_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  message_id uuid REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,
  tag text NOT NULL,
  note text,
  tagged_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bct_phone_created ON public.bot_conversation_tags (phone, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_conversation_tags TO authenticated;
GRANT ALL ON public.bot_conversation_tags TO service_role;
ALTER TABLE public.bot_conversation_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage conversation tags" ON public.bot_conversation_tags;
CREATE POLICY "admins manage conversation tags" ON public.bot_conversation_tags
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_templates TO authenticated;
GRANT ALL ON public.bot_templates TO service_role;
DROP POLICY IF EXISTS "admins manage bot templates" ON public.bot_templates;
CREATE POLICY "admins manage bot templates" ON public.bot_templates
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "anyone reads active bot templates" ON public.bot_templates;
CREATE POLICY "anyone reads active bot templates" ON public.bot_templates
  FOR SELECT USING (is_active = true);

CREATE OR REPLACE FUNCTION public.apply_bot_template_update(
  _template_id uuid, _message_body text, _buttons jsonb,
  _footer text, _is_active boolean, _edit_note text DEFAULT NULL
) RETURNS public.bot_templates
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _t public.bot_templates;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.bot_template_versions(template_id, template_key, version, message_body, buttons, footer, is_active, edited_by, edit_note)
  SELECT id, template_key, version, message_body, buttons, footer, is_active, auth.uid(), _edit_note
    FROM public.bot_templates WHERE id = _template_id;
  UPDATE public.bot_templates
     SET message_body=_message_body, buttons=COALESCE(_buttons,'[]'::jsonb), footer=_footer,
         is_active=_is_active, version=version+1, updated_by=auth.uid(), updated_at=now()
   WHERE id = _template_id RETURNING * INTO _t;
  IF NOT FOUND THEN RAISE EXCEPTION 'Template not found'; END IF;
  RETURN _t;
END $$;

CREATE OR REPLACE FUNCTION public.restore_bot_template_version(_version_id uuid)
RETURNS public.bot_templates
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _v public.bot_template_versions;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO _v FROM public.bot_template_versions WHERE id = _version_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Version not found'; END IF;
  RETURN public.apply_bot_template_update(_v.template_id, _v.message_body, _v.buttons, _v.footer, _v.is_active, 'שחזור גרסה ' || _v.version);
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bot_templates;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bot_ai_config;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
