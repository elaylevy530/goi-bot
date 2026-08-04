
GRANT SELECT, INSERT, UPDATE, DELETE ON public.couriers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_outcomes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.status_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.withdrawal_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courier_location_pings TO authenticated;
GRANT SELECT ON public.courier_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courier_tags TO authenticated;
GRANT SELECT ON public.tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.areas TO authenticated;
GRANT SELECT ON public.bot_templates TO authenticated;
GRANT SELECT ON public.classification_rules TO authenticated;
GRANT SELECT ON public.bot_conversations TO authenticated;
GRANT SELECT ON public.whatsapp_messages TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

GRANT ALL ON public.couriers, public.customers, public.jobs, public.job_outcomes,
  public.job_tags, public.offer_events, public.status_logs, public.withdrawal_requests,
  public.courier_location_pings, public.courier_stats, public.courier_tags, public.tags,
  public.areas, public.bot_templates, public.classification_rules, public.bot_conversations,
  public.whatsapp_messages, public.user_roles TO service_role;
