CREATE TABLE sync_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_sync_started TIMESTAMPTZ,
  last_sync_completed TIMESTAMPTZ,
  last_sync_failed TIMESTAMPTZ,
  issues_checked INTEGER DEFAULT 0,
  errors TEXT,
  api_requests_made INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- We only need one row to track global sync health
INSERT INTO sync_health (id) VALUES ('00000000-0000-0000-0000-000000000001');

ALTER TABLE sync_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sync health"
  ON sync_health
  FOR SELECT
  USING (true);

-- The backend Service Role will update this table, bypassing RLS.
