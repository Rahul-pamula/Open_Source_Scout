-- Add contribution_checklist JSONB column to tracked_issues
ALTER TABLE public.tracked_issues
ADD COLUMN contribution_checklist JSONB DEFAULT '{"work_done": false, "pr_sent": false, "merged": false, "issue_closed": false}'::jsonb;
