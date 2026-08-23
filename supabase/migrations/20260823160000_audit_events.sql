CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_name TEXT NOT NULL,
  issue_number INTEGER NOT NULL,
  intent TEXT NOT NULL,
  draft TEXT,
  autonomy_level TEXT NOT NULL,
  safety_decision JSONB NOT NULL,
  result TEXT NOT NULL,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read audit events"
  ON audit_events
  FOR SELECT
  USING (true);
