
-- =========================================================
-- ENUM TYPES
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'manager');

CREATE TYPE public.courier_status AS ENUM (
  'חדש','נרשם','ממתין לאישור','פעיל','חסר פרטים',
  'שלחתי עבודה','לקח עבודה','לא רלוונטי','חסום'
);

CREATE TYPE public.vehicle_type AS ENUM ('קטנוע','רכב','אופניים חשמליים','הליכה');

CREATE TYPE public.invoice_status AS ENUM ('כן','לא','בתהליך');

CREATE TYPE public.job_type AS ENUM (
  'משלוח בודד','משמרת לפי שעה','קו חלוקה','משלוחי אוכל','חבילות / מסמכים','אחר'
);

CREATE TYPE public.job_status AS ENUM (
  'טיוטה','נשלחה לשליחים','ממתינה לתגובות','יש שליחים שאישרו',
  'נבחר שליח','פעילה','הושלמה','בוטלה','תקועה'
);

CREATE TYPE public.customer_type AS ENUM ('מסעדה','חנות','עסק מקומי','לקוח פרטי','חברת הפצה','אחר');

CREATE TYPE public.preferred_job_type AS ENUM ('משלוח בודד','משמרת לפי שעה','קו קבוע','מכרז שליחים','מחיר קבוע');

CREATE TYPE public.customer_status AS ENUM ('חדש','פעיל','מושהה');

CREATE TYPE public.message_audience AS ENUM ('courier','customer','admin');

CREATE TYPE public.bot_handling_status AS ENUM ('חדש','בטיפול','טופל','לא זוהה');

CREATE TYPE public.bot_user_type AS ENUM ('courier','customer','unknown');

CREATE TYPE public.withdrawal_status AS ENUM ('ממתינה','אושרה','שולמה','נדחתה');

CREATE TYPE public.message_direction AS ENUM ('outbound','inbound');

CREATE TYPE public.message_delivery_status AS ENUM ('pending','sent','failed','read');

-- =========================================================
-- USER ROLES (security-definer pattern)
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE POLICY "Users can read their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- updated_at trigger helper
-- =========================================================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================================================
-- AREAS
-- =========================================================
CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.areas TO authenticated;
GRANT ALL ON public.areas TO service_role;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage areas" ON public.areas FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =========================================================
-- TAGS
-- =========================================================
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  is_automatic BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage tags" ON public.tags FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =========================================================
-- COURIERS
-- =========================================================
CREATE TABLE public.couriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  whatsapp_phone TEXT NOT NULL UNIQUE,
  base_city TEXT,
  working_areas TEXT[] NOT NULL DEFAULT '{}',
  vehicle_type public.vehicle_type,
  job_types public.job_type[] NOT NULL DEFAULT '{}',
  availability TEXT[] NOT NULL DEFAULT '{}',
  invoice_status public.invoice_status DEFAULT 'לא',
  experience TEXT,
  courier_status public.courier_status NOT NULL DEFAULT 'חדש',
  notes TEXT,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_couriers_status ON public.couriers(courier_status);
CREATE INDEX idx_couriers_phone ON public.couriers(whatsapp_phone);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.couriers TO authenticated;
GRANT ALL ON public.couriers TO service_role;
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage couriers" ON public.couriers FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER tg_couriers_updated_at BEFORE UPDATE ON public.couriers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- COURIER_TAGS
-- =========================================================
CREATE TABLE public.courier_tags (
  courier_id UUID NOT NULL REFERENCES public.couriers(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  assigned_automatically BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (courier_id, tag_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courier_tags TO authenticated;
GRANT ALL ON public.courier_tags TO service_role;
ALTER TABLE public.courier_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage courier_tags" ON public.courier_tags FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =========================================================
-- CUSTOMERS
-- =========================================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  customer_type public.customer_type NOT NULL DEFAULT 'אחר',
  business_name TEXT,
  city TEXT,
  address TEXT,
  preferred_job_type public.preferred_job_type DEFAULT 'משלוח בודד',
  status public.customer_status NOT NULL DEFAULT 'חדש',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_phone ON public.customers(phone);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage customers" ON public.customers FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER tg_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- JOBS
-- =========================================================
CREATE SEQUENCE public.jobs_seq START 1001;

CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number TEXT NOT NULL UNIQUE DEFAULT ('GOI-' || nextval('public.jobs_seq')::text),
  job_type public.job_type NOT NULL DEFAULT 'משלוח בודד',
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  pickup_area TEXT,
  dropoff_area TEXT,
  pickup_address TEXT,
  dropoff_address TEXT,
  job_date DATE,
  job_time TIME,
  payment NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  vehicle_required public.vehicle_type,
  invoice_required BOOLEAN NOT NULL DEFAULT false,
  couriers_needed INTEGER NOT NULL DEFAULT 1,
  status public.job_status NOT NULL DEFAULT 'טיוטה',
  matching_couriers_count INTEGER NOT NULL DEFAULT 0,
  selected_courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_customer ON public.jobs(customer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage jobs" ON public.jobs FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER tg_jobs_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- JOB_TAGS
-- =========================================================
CREATE TABLE public.job_tags (
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, tag_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_tags TO authenticated;
GRANT ALL ON public.job_tags TO service_role;
ALTER TABLE public.job_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage job_tags" ON public.job_tags FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =========================================================
-- WHATSAPP MESSAGES
-- =========================================================
CREATE TABLE public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  template_id UUID,
  direction public.message_direction NOT NULL DEFAULT 'outbound',
  body TEXT NOT NULL,
  delivery_status public.message_delivery_status NOT NULL DEFAULT 'pending',
  error_text TEXT,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wa_phone ON public.whatsapp_messages(phone);
CREATE INDEX idx_wa_job ON public.whatsapp_messages(job_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage whatsapp_messages" ON public.whatsapp_messages FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =========================================================
-- BOT TEMPLATES
-- =========================================================
CREATE TABLE public.bot_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  audience public.message_audience NOT NULL,
  message_body TEXT NOT NULL,
  variables_supported TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_templates TO authenticated;
GRANT ALL ON public.bot_templates TO service_role;
ALTER TABLE public.bot_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage bot_templates" ON public.bot_templates FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER tg_templates_updated_at BEFORE UPDATE ON public.bot_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- STATUS LOGS (generic — entity_type + entity_id)
-- =========================================================
CREATE TABLE public.status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  note TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_status_logs_entity ON public.status_logs(entity_type, entity_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.status_logs TO authenticated;
GRANT ALL ON public.status_logs TO service_role;
ALTER TABLE public.status_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage status_logs" ON public.status_logs FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =========================================================
-- CLASSIFICATION RULES
-- =========================================================
CREATE TABLE public.classification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  field TEXT NOT NULL,       -- vehicle_type | job_types | working_areas | availability | invoice_status
  operator TEXT NOT NULL,    -- equals | includes
  value TEXT NOT NULL,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classification_rules TO authenticated;
GRANT ALL ON public.classification_rules TO service_role;
ALTER TABLE public.classification_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage classification_rules" ON public.classification_rules FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =========================================================
-- BOT CONVERSATIONS
-- =========================================================
CREATE TABLE public.bot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  display_name TEXT,
  user_type public.bot_user_type NOT NULL DEFAULT 'unknown',
  courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  last_message TEXT,
  handling_status public.bot_handling_status NOT NULL DEFAULT 'חדש',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bot_phone ON public.bot_conversations(phone);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_conversations TO authenticated;
GRANT ALL ON public.bot_conversations TO service_role;
ALTER TABLE public.bot_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage bot_conversations" ON public.bot_conversations FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER tg_bot_conv_updated_at BEFORE UPDATE ON public.bot_conversations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- WITHDRAWAL REQUESTS
-- =========================================================
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id UUID NOT NULL REFERENCES public.couriers(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  bank_name TEXT,
  bank_branch TEXT,
  bank_account TEXT,
  account_owner TEXT,
  bit_phone TEXT,
  payment_method TEXT NOT NULL DEFAULT 'bank',  -- bank | bit | paybox | cash
  status public.withdrawal_status NOT NULL DEFAULT 'ממתינה',
  note TEXT,
  rejection_reason TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  reference_number TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_withdrawals_status ON public.withdrawal_requests(status);
CREATE INDEX idx_withdrawals_courier ON public.withdrawal_requests(courier_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage withdrawal_requests" ON public.withdrawal_requests FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER tg_withdrawals_updated_at BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- SEED: default areas
-- =========================================================
INSERT INTO public.areas (name) VALUES
  ('תל אביב'),('רמת גן'),('גבעתיים'),('פתח תקווה'),('בני ברק'),
  ('ראשון לציון'),('חולון'),('בת ים'),('הרצליה'),('ירושלים'),('חיפה'),('אחר')
ON CONFLICT (name) DO NOTHING;

-- =========================================================
-- SEED: default courier tags
-- =========================================================
INSERT INTO public.tags (name, is_automatic) VALUES
  ('שליח אוכל', true),
  ('שליח חבילות', true),
  ('שליח משמרות', true),
  ('שליח קווים', true),
  ('קטנוע', true),
  ('רכב', true),
  ('אופניים חשמליים', true),
  ('שליח תל אביב', true),
  ('שליח ערב', true),
  ('עם חשבונית', true),
  ('ללא חשבונית', true)
ON CONFLICT (name) DO NOTHING;

-- =========================================================
-- SEED: default templates
-- =========================================================
INSERT INTO public.bot_templates (template_name, audience, message_body, variables_supported, is_active) VALUES
  ('ברוכים הבאים לשליח','courier','שלום {{name}}, ברוך הבא ל-Goi! נשמח להכיר אותך כשליח/ה במערכת. נחזור אליך בקרוב.', ARRAY['{{name}}'], true),
  ('אישור הרשמה','courier','היי {{name}}, ההרשמה שלך התקבלה! מנהל מטעמנו יבדוק את הפרטים ויחזור אליך.', ARRAY['{{name}}'], true),
  ('חסר פרטים','courier','היי {{name}}, חסרים לנו פרטים בפרופיל שלך. נא להשלים בקישור: {{login_link}}', ARRAY['{{name}}','{{login_link}}'], true),
  ('אושר כפעיל','courier','מזל טוב {{name}}! אושרת כשליח/ה פעיל ב-Goi. שם משתמש: {{username}} סיסמה: {{password}}', ARRAY['{{name}}','{{username}}','{{password}}'], true),
  ('עבודה חדשה','courier','🚀 עבודה חדשה ב-Goi!\nסוג: {{job_type}}\nאזור: {{area}}\nשעה: {{time}}\nתשלום: {{payment}} ₪\nרוצה לקחת? השב 1.', ARRAY['{{job_type}}','{{area}}','{{time}}','{{payment}}'], true),
  ('תזכורת זמינות','courier','היי {{name}}, האם תהיה זמין/ה היום ל{{job_type}} באזור {{area}}?', ARRAY['{{name}}','{{job_type}}','{{area}}'], true),
  ('עדכון פרטים','courier','היי {{name}}, נא לעדכן את הפרטים שלך בקישור: {{login_link}}', ARRAY['{{name}}','{{login_link}}'], true),
  ('ברוכים הבאים למזמין','customer','שלום {{name}}, ברוכים הבאים ל-Goi! מהיום אפשר להזמין שליחים בקלות.', ARRAY['{{name}}'], true),
  ('יצירת עבודה','customer','עבודה חדשה נוצרה במערכת. סוג: {{job_type}}, אזור: {{area}}, שעה: {{time}}.', ARRAY['{{job_type}}','{{area}}','{{time}}'], true),
  ('סיכום עבודה','customer','סיכום עבודה — {{job_type}} באזור {{area}} בשעה {{time}}. עלות: {{payment}} ₪.', ARRAY['{{job_type}}','{{area}}','{{time}}','{{payment}}'], true),
  ('מצאנו שליחים','customer','מצאנו שליחים מתאימים לעבודה שלך! נעדכן ברגע שנבחר שליח.', ARRAY[]::TEXT[], true),
  ('נבחר שליח','customer','השליח {{name}} ({{phone}}) נבחר ויגיע בזמן {{time}}.', ARRAY['{{name}}','{{phone}}','{{time}}'], true),
  ('אין שליחים זמינים','customer','לצערנו לא נמצאו שליחים זמינים לעבודה. נציג Goi יחזור אליך לתאם פתרון.', ARRAY[]::TEXT[], true),
  ('עבודה הסתיימה','customer','העבודה הושלמה בהצלחה! תודה שבחרת ב-Goi.', ARRAY[]::TEXT[], true);

-- =========================================================
-- SEED: classification rules (resolve tag ids via name)
-- =========================================================
INSERT INTO public.classification_rules (description, field, operator, value, tag_id, enabled)
SELECT 'רכב = קטנוע → תג קטנוע','vehicle_type','equals','קטנוע', t.id, true FROM public.tags t WHERE t.name='קטנוע';

INSERT INTO public.classification_rules (description, field, operator, value, tag_id, enabled)
SELECT 'רכב = רכב → תג רכב','vehicle_type','equals','רכב', t.id, true FROM public.tags t WHERE t.name='רכב';

INSERT INTO public.classification_rules (description, field, operator, value, tag_id, enabled)
SELECT 'סוגי עבודה כוללים משמרת → תג שליח משמרות','job_types','includes','משמרת לפי שעה', t.id, true FROM public.tags t WHERE t.name='שליח משמרות';

INSERT INTO public.classification_rules (description, field, operator, value, tag_id, enabled)
SELECT 'סוגי עבודה כוללים משלוח בודד → תג שליח אוכל','job_types','includes','משלוח בודד', t.id, true FROM public.tags t WHERE t.name='שליח אוכל';

INSERT INTO public.classification_rules (description, field, operator, value, tag_id, enabled)
SELECT 'אזור עבודה כולל תל אביב → תג שליח תל אביב','working_areas','includes','תל אביב', t.id, true FROM public.tags t WHERE t.name='שליח תל אביב';

INSERT INTO public.classification_rules (description, field, operator, value, tag_id, enabled)
SELECT 'זמינות כוללת ערב → תג שליח ערב','availability','includes','ערב', t.id, true FROM public.tags t WHERE t.name='שליח ערב';

INSERT INTO public.classification_rules (description, field, operator, value, tag_id, enabled)
SELECT 'חשבונית = כן → תג עם חשבונית','invoice_status','equals','כן', t.id, true FROM public.tags t WHERE t.name='עם חשבונית';
