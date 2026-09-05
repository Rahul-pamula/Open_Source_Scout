-- Add claimed_via column to tracked_issues to distinguish manual vs automated claims
ALTER TABLE public.tracked_issues
ADD COLUMN IF NOT EXISTS claimed_via TEXT DEFAULT 'MANUAL';
