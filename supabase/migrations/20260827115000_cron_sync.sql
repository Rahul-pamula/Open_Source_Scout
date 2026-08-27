-- Enable pg_net and pg_cron extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule if exists to avoid conflicts during repeated migrations
DO $$
BEGIN
  PERFORM cron.unschedule('global-github-sync');
EXCEPTION WHEN OTHERS THEN
  -- ignore error if job does not exist
END $$;

-- Schedule the cron job to run every 15 minutes
-- It will hit the new global-sync Edge Function using pg_net
SELECT cron.schedule(
    'global-github-sync',
    '*/15 * * * *',
    $$
    SELECT net.http_post(
        url := current_setting('app.settings.edge_function_url', true) || '/global-sync',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        )
    );
    $$
);
