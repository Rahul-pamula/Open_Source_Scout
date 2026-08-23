CREATE TABLE autonomy_policy (
  user_id UUID PRIMARY KEY,
  level TEXT NOT NULL DEFAULT 'L1',
  enabled BOOLEAN NOT NULL DEFAULT false,
  allowed_repositories TEXT[] NOT NULL DEFAULT '{}',
  allowed_intents TEXT[] NOT NULL DEFAULT '{}',
  minimum_match_score INTEGER NOT NULL DEFAULT 85,
  maximum_daily_engagements INTEGER NOT NULL DEFAULT 5,
  cooldown_minutes INTEGER NOT NULL DEFAULT 30,
  require_no_claimant BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE autonomy_policy ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own policy
CREATE POLICY "Users can manage their own autonomy policy"
  ON autonomy_policy
  FOR ALL
  USING (auth.uid() = user_id);
