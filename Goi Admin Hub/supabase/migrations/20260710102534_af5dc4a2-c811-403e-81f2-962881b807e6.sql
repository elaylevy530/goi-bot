
CREATE TABLE public.business_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  phone text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'dispatcher' CHECK (role IN ('manager','dispatcher','viewer')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, phone)
);

CREATE INDEX idx_business_team_members_business ON public.business_team_members(business_id);
CREATE INDEX idx_business_team_members_user ON public.business_team_members(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_team_members TO authenticated;
GRANT ALL ON public.business_team_members TO service_role;

ALTER TABLE public.business_team_members ENABLE ROW LEVEL SECURITY;

-- Business owner can manage their own team members
CREATE POLICY "business owner manages team"
  ON public.business_team_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = business_team_members.business_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = business_team_members.business_id
        AND c.user_id = auth.uid()
    )
  );

-- Admin sees all
CREATE POLICY "admin sees all team members"
  ON public.business_team_members
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER update_business_team_members_updated_at
  BEFORE UPDATE ON public.business_team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
