-- Workspace Links RLS
ALTER TABLE public.workspace_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own workspace links"
  ON public.workspace_links
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
