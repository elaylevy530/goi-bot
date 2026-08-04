UPDATE public.couriers
SET admin_jobs_blocked = true
WHERE whatsapp_phone NOT IN ('0509810021', '+972509810021', '972509810021', '509810021');

UPDATE public.couriers
SET admin_jobs_blocked = false
WHERE whatsapp_phone IN ('0509810021', '+972509810021', '972509810021', '509810021');