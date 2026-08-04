
-- 1) Denormalize business logo path onto jobs so couriers can read it
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS customer_logo_path text;

CREATE OR REPLACE FUNCTION public.set_job_customer_logo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    SELECT logo_url INTO NEW.customer_logo_path
    FROM public.customers WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_job_customer_logo ON public.jobs;
CREATE TRIGGER trg_set_job_customer_logo
BEFORE INSERT ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_job_customer_logo();

-- Backfill: copy current logo for existing jobs missing a snapshot
UPDATE public.jobs j
SET customer_logo_path = c.logo_url
FROM public.customers c
WHERE j.customer_id = c.id
  AND j.customer_logo_path IS NULL
  AND c.logo_url IS NOT NULL;

-- Keep it fresh: when a business updates their logo, update their in-flight jobs
CREATE OR REPLACE FUNCTION public.sync_customer_logo_to_jobs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.logo_url IS DISTINCT FROM OLD.logo_url THEN
    UPDATE public.jobs
    SET customer_logo_path = NEW.logo_url
    WHERE customer_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_customer_logo_to_jobs ON public.customers;
CREATE TRIGGER trg_sync_customer_logo_to_jobs
AFTER UPDATE OF logo_url ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.sync_customer_logo_to_jobs();

-- 2) Storage policies for the business-logos bucket
-- Owner path convention: "{customer_id}/logo.{ext}"

CREATE POLICY "business can upload own logo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'business-logos'
  AND EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.user_id = auth.uid()
      AND c.id::text = (storage.foldername(objects.name))[1]
  )
);

CREATE POLICY "business can update own logo"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'business-logos'
  AND EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.user_id = auth.uid()
      AND c.id::text = (storage.foldername(objects.name))[1]
  )
);

CREATE POLICY "business can delete own logo"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'business-logos'
  AND EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.user_id = auth.uid()
      AND c.id::text = (storage.foldername(objects.name))[1]
  )
);

CREATE POLICY "authenticated can read business logos"
ON storage.objects FOR SELECT TO authenticated
USING ( bucket_id = 'business-logos' );
