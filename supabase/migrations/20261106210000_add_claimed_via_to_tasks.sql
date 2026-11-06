-- Add claimed_via column to tasks table to match tracked_issues schema and edge functions
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS claimed_via TEXT DEFAULT 'MANUAL';
