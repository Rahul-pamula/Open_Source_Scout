CREATE TABLE engagement_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  repo_name TEXT NOT NULL,
  issue_number INTEGER NOT NULL,
  intent TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  github_comment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE engagement_log ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own logs
CREATE POLICY "Users can manage their own engagement logs"
  ON engagement_log
  FOR ALL
  USING (auth.uid() = user_id);
