CREATE TABLE execution_locks (
  lock_key TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Strictly backend-managed
ALTER TABLE execution_locks ENABLE ROW LEVEL SECURITY;
