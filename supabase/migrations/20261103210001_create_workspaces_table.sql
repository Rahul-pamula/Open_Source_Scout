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

CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON public.workspaces(user_id);
