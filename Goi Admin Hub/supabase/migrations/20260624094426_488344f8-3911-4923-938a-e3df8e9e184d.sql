DROP POLICY IF EXISTS "anon_view_by_token" ON public.job_stops;
REVOKE SELECT ON public.job_stops FROM anon;

DROP POLICY IF EXISTS "anyone reads active bot templates" ON public.bot_templates;
CREATE POLICY "authenticated reads active bot templates"
  ON public.bot_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);
REVOKE SELECT ON public.bot_templates FROM anon;