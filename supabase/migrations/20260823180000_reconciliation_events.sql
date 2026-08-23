CREATE TABLE reconciliation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_issue_id UUID NOT NULL REFERENCES tracked_issues(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  previous_state TEXT,
  new_state TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note: We must also add needs_attention to tracked_issues
ALTER TABLE tracked_issues ADD COLUMN needs_attention BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE reconciliation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reconciliation events"
  ON reconciliation_events
  FOR SELECT
  USING (true);
