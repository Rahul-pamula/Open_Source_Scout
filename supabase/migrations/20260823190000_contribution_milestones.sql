CREATE TABLE contribution_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_issue_id UUID NOT NULL REFERENCES tracked_issues(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('github', 'user')),
  metadata JSONB,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tracked_issue_id, milestone_type)
);

ALTER TABLE contribution_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read contribution milestones"
  ON contribution_milestones
  FOR SELECT
  USING (true);
