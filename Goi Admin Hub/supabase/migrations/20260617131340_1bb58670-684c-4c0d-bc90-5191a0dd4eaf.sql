ALTER TABLE public.status_logs REPLICA IDENTITY FULL;
ALTER TABLE public.job_outcomes REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'status_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.status_logs;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'job_outcomes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.job_outcomes;
  END IF;
END $$;