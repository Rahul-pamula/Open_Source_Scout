-- 3. Workspace Credentials Table (Zero-Knowledge AES-256 Vault Items)
CREATE TABLE IF NOT EXISTS public.workspace_credentials (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id   UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_name   TEXT NOT NULL,
  username       TEXT NOT NULL,
  encrypted_data JSONB NOT NULL,
  notes          TEXT,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_credentials_workspace_id ON public.workspace_credentials(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_credentials_user_id ON public.workspace_credentials(user_id);
