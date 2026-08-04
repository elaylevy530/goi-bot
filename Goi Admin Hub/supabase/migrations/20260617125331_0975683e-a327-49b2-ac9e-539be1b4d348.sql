ALTER TABLE public.jobs REPLICA IDENTITY FULL;
ALTER TABLE public.offer_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.offer_events;