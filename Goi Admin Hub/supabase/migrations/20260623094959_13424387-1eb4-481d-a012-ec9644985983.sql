
CREATE INDEX IF NOT EXISTS idx_jobs_customer_status_created
  ON public.jobs (customer_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_customer_jobtype_created
  ON public.jobs (customer_id, job_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_customer_created
  ON public.jobs (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_selected_courier_status
  ON public.jobs (selected_courier_id, status)
  WHERE selected_courier_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_offer_events_job_courier_response
  ON public.offer_events (job_id, courier_id, response);

CREATE INDEX IF NOT EXISTS idx_offer_events_job_response
  ON public.offer_events (job_id, response);

CREATE INDEX IF NOT EXISTS idx_courier_declines_courier_job
  ON public.courier_job_declines (courier_id, job_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_external_id
  ON public.whatsapp_messages (external_message_id)
  WHERE external_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone_sent
  ON public.whatsapp_messages (phone, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_business_notifications_biz_created
  ON public.business_notifications (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_couriers_status_phone
  ON public.couriers (courier_status)
  WHERE whatsapp_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_green_webhook_events_status_received
  ON public.green_api_webhook_events (processing_status, received_at DESC);

ANALYZE public.jobs;
ANALYZE public.offer_events;
ANALYZE public.whatsapp_messages;
ANALYZE public.business_notifications;
ANALYZE public.couriers;
