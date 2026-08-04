-- 1. הוספת עמודת מין
ALTER TABLE public.couriers ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.couriers ADD CONSTRAINT couriers_gender_check CHECK (gender IS NULL OR gender IN ('זכר', 'נקבה'));

-- 2. ניקוי ברירת מחדל שנשענת על ה-enum (אם קיימת) והמרה לטקסט
ALTER TABLE public.couriers ALTER COLUMN invoice_status DROP DEFAULT;
ALTER TABLE public.couriers ALTER COLUMN invoice_status TYPE TEXT;
UPDATE public.couriers SET invoice_status = 'תסדרו אותי' WHERE invoice_status = 'בתהליך';
ALTER TABLE public.couriers ADD CONSTRAINT couriers_invoice_status_check CHECK (invoice_status IS NULL OR invoice_status IN ('כן', 'לא', 'תסדרו אותי'));

-- 3. מחיקת ה-enum הישן
DROP TYPE IF EXISTS public.invoice_status CASCADE;