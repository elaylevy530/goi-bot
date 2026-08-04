CREATE TRIGGER tg_recompute_stats_outcome
AFTER INSERT OR UPDATE OR DELETE ON public.job_outcomes
FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_stats_offer();

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['couriers','withdrawal_requests','conversations','messages','business_notifications']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;