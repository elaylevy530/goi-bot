CREATE OR REPLACE FUNCTION public.gen_job_short_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  alphabet text := 'abcdefghijkmnpqrstuvwxyz23456789';
  code text;
  i int;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.jobs WHERE short_code = code);
  END LOOP;
  RETURN code;
END;
$$;

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS short_code text;

UPDATE public.jobs SET short_code = public.gen_job_short_code() WHERE short_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS jobs_short_code_key ON public.jobs (short_code);

CREATE OR REPLACE FUNCTION public.tg_set_job_short_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.short_code IS NULL THEN
    NEW.short_code := public.gen_job_short_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_job_short_code ON public.jobs;
CREATE TRIGGER set_job_short_code
BEFORE INSERT ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.tg_set_job_short_code();