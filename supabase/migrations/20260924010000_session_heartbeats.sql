-- Add last_heartbeat_at to task_sessions
ALTER TABLE public.task_sessions
ADD COLUMN last_heartbeat_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL;

-- Make sure pg_cron is available (it should be on Supabase, but we can't always CREATE EXTENSION if it exists in another schema, so we usually just assume it's available in 'cron' schema or create it if not. Supabase enables it by default).
-- Supabase specifically provides the cron extension.

CREATE OR REPLACE FUNCTION public.reap_stale_sessions()
RETURNS void AS $$
BEGIN
  -- We find stale sessions and mark them FAILED.
  -- A session is stale if it's ACTIVE and last_heartbeat_at is > 5 minutes ago.
  WITH stale_sessions AS (
    UPDATE public.task_sessions
    SET status = 'FAILED'::execution_state
    WHERE status = 'ACTIVE'::execution_state
      AND last_heartbeat_at < (now() - interval '5 minutes')
    RETURNING task_id
  )
  -- Then update the associated tasks to QUEUED so they can be retried.
  UPDATE public.tasks
  SET state = 'QUEUED'::execution_state
  WHERE id IN (SELECT task_id FROM stale_sessions)
    AND state = 'ACTIVE'::execution_state;
END;
$$ LANGUAGE plpgsql;

-- Schedule the cron job to run every minute
SELECT cron.schedule(
  'reap-stale-sessions',
  '* * * * *',
  $$SELECT public.reap_stale_sessions();$$
);
