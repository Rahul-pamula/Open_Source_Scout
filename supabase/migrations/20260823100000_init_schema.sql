-- Enums
CREATE TYPE issue_state AS ENUM ('DISCOVERED', 'EVALUATED', 'DRAFTED', 'ENGAGED', 'ASSIGNED', 'COMPLETED', 'REJECTED');

-- Users Table
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  github_handle TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tracked Issues Table
CREATE TABLE public.tracked_issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  github_issue_url TEXT NOT NULL,
  title TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  state issue_state DEFAULT 'DISCOVERED'::issue_state NOT NULL,
  match_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, github_issue_url)
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_issues ENABLE ROW LEVEL SECURITY;

-- Users RLS Policies
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Tracked Issues RLS Policies
CREATE POLICY "Users can view their own tracked issues"
  ON public.tracked_issues FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tracked issues"
  ON public.tracked_issues FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracked issues"
  ON public.tracked_issues FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracked issues"
  ON public.tracked_issues FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at Trigger Helper
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_modtime
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_tracked_issues_modtime
  BEFORE UPDATE ON public.tracked_issues
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
