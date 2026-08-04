
-- Drop the WhatsApp availability auto-toggle
DROP TRIGGER IF EXISTS trg_apply_courier_whatsapp_availability ON public.green_api_webhook_events;
DROP FUNCTION IF EXISTS public.apply_courier_whatsapp_availability();

-- Reactivate all couriers that aren't blocked/suspended
UPDATE public.couriers
   SET courier_status = 'פעיל'::public.courier_status,
       accepting_jobs = true,
       is_paused = false,
       updated_at = now()
 WHERE courier_status::text NOT IN ('חסום', 'ממתין לאישור');
