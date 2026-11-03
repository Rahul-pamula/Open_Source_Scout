-- ==============================================================================
-- Open Source Scout - Workspaces & Secure App Launcher Schema
-- Migration: 20261103210000_create_workspaces_tables.sql
-- ==============================================================================

-- 1. Workspaces Table
CREATE TABLE IF NOT EXISTS public.workspaces (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  icon        TEXT DEFAULT 'briefcase' NOT NULL,
  color       TEXT DEFAULT '#10b981' NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Index on user_id for fast workspace filtering
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON public.workspaces(user_id);

-- 2. Workspace Links Table (App Launcher Items)
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

-- 3. Workspace Credentials Table (Zero-Knowledge AES-256 Vault Items)
CREATE TABLE IF NOT EXISTS public.workspace_credentials (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id   UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_name   TEXT NOT NULL,
  username       TEXT NOT NULL,
  encrypted_data JSONB NOT NULL, -- Stores { v, salt, iv, data }
  notes          TEXT,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_credentials_workspace_id ON public.workspace_credentials(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_credentials_user_id ON public.workspace_credentials(user_id);

-- ==============================================================================
-- Row Level Security (RLS) Isolation Policies
-- ==============================================================================

-- Enable RLS on all three tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_credentials ENABLE ROW LEVEL SECURITY;

-- Workspaces RLS
CREATE POLICY "Users can manage their own workspaces"
  ON public.workspaces
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Workspace Links RLS
CREATE POLICY "Users can manage their own workspace links"
  ON public.workspace_links
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Workspace Credentials RLS
CREATE POLICY "Users can manage their own workspace credentials"
  ON public.workspace_credentials
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- Triggers: handle_updated_at
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_workspaces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER trigger_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_workspaces_updated_at();

DROP TRIGGER IF EXISTS trigger_workspace_links_updated_at ON public.workspace_links;
CREATE TRIGGER trigger_workspace_links_updated_at
  BEFORE UPDATE ON public.workspace_links
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_workspaces_updated_at();

DROP TRIGGER IF EXISTS trigger_workspace_credentials_updated_at ON public.workspace_credentials;
CREATE TRIGGER trigger_workspace_credentials_updated_at
  BEFORE UPDATE ON public.workspace_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_workspaces_updated_at();
