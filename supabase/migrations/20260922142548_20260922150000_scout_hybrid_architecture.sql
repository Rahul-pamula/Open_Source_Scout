-- 1. Enums
CREATE TYPE task_platform AS ENUM ('github', 'jira', 'linear', 'manual');

-- 2. Tasks Table
CREATE TABLE public.tasks (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Platform identity
  platform         task_platform NOT NULL DEFAULT 'github',
  external_id      TEXT NOT NULL,
  external_url     TEXT NOT NULL,

  -- Universal task fields
  title            TEXT NOT NULL,
  description      TEXT,
  repo_name        TEXT,
  repo_clone_url   TEXT,
  priority         TEXT,
  labels           TEXT[],

  -- Scout state machine
  state            issue_state DEFAULT 'DISCOVERED' NOT NULL,
  match_score      INTEGER,

  -- Agent execution metadata
  agent_status     TEXT,
  agent_ide        TEXT,
  pr_url           TEXT,

  integration_id   UUID,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(user_id, platform, external_id)
);

-- 3. Task Sessions Table (MCP Session Tracking)
CREATE TABLE public.task_sessions (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id               UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  starting_commit_hash  TEXT NOT NULL,
  status                TEXT DEFAULT 'active',
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 4. Integrations Table (OAuth connections)
CREATE TABLE public.integrations (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform         task_platform NOT NULL,
  workspace_name   TEXT,
  access_token     TEXT,
  refresh_token    TEXT,
  webhook_secret   TEXT,
  config           JSONB,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(user_id, platform)
);

-- 5. State Transition Guard (Defense in Depth)
CREATE OR REPLACE FUNCTION validate_state_transition()
RETURNS trigger AS $$
BEGIN
  IF OLD.state = NEW.state THEN
    RETURN NEW;
  END IF;

  IF OLD.state = 'DISCOVERED' AND NEW.state NOT IN ('EVALUATED', 'REJECTED') THEN
    RAISE EXCEPTION 'Invalid transition from DISCOVERED to %', NEW.state;
  ELSIF OLD.state = 'EVALUATED' AND NEW.state NOT IN ('DRAFTED', 'ENGAGED', 'REJECTED') THEN
    RAISE EXCEPTION 'Invalid transition from EVALUATED to %', NEW.state;
  ELSIF OLD.state = 'DRAFTED' AND NEW.state NOT IN ('ENGAGED', 'REJECTED') THEN
    RAISE EXCEPTION 'Invalid transition from DRAFTED to %', NEW.state;
  ELSIF OLD.state = 'ENGAGED' AND NEW.state NOT IN ('ASSIGNED', 'REJECTED') THEN
    RAISE EXCEPTION 'Invalid transition from ENGAGED to %', NEW.state;
  ELSIF OLD.state = 'ASSIGNED' AND NEW.state NOT IN ('COMPLETED', 'REJECTED') THEN
    RAISE EXCEPTION 'Invalid transition from ASSIGNED to %', NEW.state;
  ELSIF OLD.state = 'COMPLETED' THEN
    RAISE EXCEPTION 'Invalid transition from COMPLETED to %', NEW.state;
  ELSIF OLD.state = 'REJECTED' AND NEW.state NOT IN ('ENGAGED') THEN
    RAISE EXCEPTION 'Invalid transition from REJECTED to %', NEW.state;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to legacy table
CREATE TRIGGER check_tracked_issues_state_transition
  BEFORE UPDATE ON tracked_issues
  FOR EACH ROW
  EXECUTE FUNCTION validate_state_transition();

-- Apply to new table
CREATE TRIGGER check_tasks_state_transition
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION validate_state_transition();

-- 6. Row Level Security (RLS)

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can select their own tasks" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tasks" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.task_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can select their own task sessions" ON public.task_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own task sessions" ON public.task_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own task sessions" ON public.task_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own task sessions" ON public.task_sessions FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can select their own integrations" ON public.integrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own integrations" ON public.integrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own integrations" ON public.integrations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own integrations" ON public.integrations FOR DELETE USING (auth.uid() = user_id);
