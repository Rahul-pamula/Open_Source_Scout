-- Add custom comment preferences to users table
ALTER TABLE users ADD COLUMN custom_comment_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN custom_comment_text TEXT;
