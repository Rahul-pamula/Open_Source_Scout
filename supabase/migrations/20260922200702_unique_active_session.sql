-- Enforce session idempotency at the database level by preventing concurrent race conditions
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_session_per_task 
ON task_sessions (task_id, user_id) 
WHERE status = 'active';
