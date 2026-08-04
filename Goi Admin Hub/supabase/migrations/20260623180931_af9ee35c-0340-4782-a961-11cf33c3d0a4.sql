DROP TRIGGER IF EXISTS trg_apply_courier_whatsapp_availability ON public.green_api_webhook_events;
DROP FUNCTION IF EXISTS public.apply_courier_whatsapp_availability();

UPDATE public.couriers
SET courier_status = 'פעיל'::public.courier_status,
    accepting_jobs = true,
    is_paused = false,
    paused_at = NULL,
    paused_reason = NULL,
    updated_at = now()
WHERE courier_status = 'ממתין לאישור'::public.courier_status;

UPDATE public.couriers
SET courier_status = 'פעיל'::public.courier_status,
    updated_at = now()
WHERE courier_status = 'לא פעיל'::public.courier_status;