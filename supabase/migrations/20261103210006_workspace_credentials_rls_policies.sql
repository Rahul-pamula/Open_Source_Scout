-- Workspace Credentials RLS
ALTER TABLE public.workspace_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own workspace credentials"
  ON public.workspace_credentials
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
