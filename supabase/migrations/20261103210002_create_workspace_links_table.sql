-- 2. Workspace Links Table
CREATE TABLE IF NOT EXISTS public.workspace_links (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title        TEXT NOT NULL,
  url          TEXT NOT NULL,
  icon_url     TEXT,
  section_name TEXT DEFAULT 'Quick Links' NOT NULL,
  position     INTEGER DEFAULT 0 NOT NULL,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_links_workspace_id ON public.workspace_links(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_links_user_id ON public.workspace_links(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_links_section ON public.workspace_links(workspace_id, section_name, position);
