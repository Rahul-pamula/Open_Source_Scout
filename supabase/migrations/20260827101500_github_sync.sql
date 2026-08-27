-- Add GitHub synchronization metadata to tracked_issues
ALTER TABLE public.tracked_issues 
ADD COLUMN github_status TEXT, -- NULL means never synced, 'open' or 'closed'
ADD COLUMN github_assignee_id BIGINT,
ADD COLUMN github_assignee_login TEXT,
ADD COLUMN last_synced_comment_id BIGINT,
ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN github_activity JSONB DEFAULT '[]'::jsonb; -- Stores array of recent activities e.g., { type: 'comment', id: 123, author: '...', created_at: '...' }
