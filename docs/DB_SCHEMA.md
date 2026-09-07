# Database Schema

Open Source Scout uses Supabase (PostgreSQL) as the canonical source of truth for your decentralised backend.

## Core Tables

### 1. `users`

Stores user identity, automation state, and contribution metrics.

- `id` (UUID): Primary key, matches Supabase Auth `auth.users.id`.
- `automation_count_today` (INT): Tracks how many issues have been automatically claimed today (max 25).
- `last_automation_date` (DATE): Used to automatically reset the daily count at midnight.

_Note: You should never need to manually insert into this table. It is maintained by triggers and edge functions._

### 2. `tracked_issues`

The core state machine for the Mission Control pipeline. Tracks issues from discovery through to completion.

- `id` (UUID): Primary key.
- `user_id` (UUID): Foreign key to `users.id`.
- `github_issue_url` (TEXT): The full GitHub URL of the issue.
- `state` (TEXT): The current pipeline state (`DISCOVERED`, `EVALUATED`, `DRAFTED`, `ENGAGED`, `ASSIGNED`, `COMPLETED`, `REJECTED`).
- `match_score` (INT): The Groq AI evaluation score (0-100).
- `claimed_via` (TEXT): How the issue was claimed (`AUTO` via edge functions, or `MANUAL` via user action).
- `contribution_checklist` (JSONB): Stores execution progress once the issue is `ASSIGNED`. Includes `{ workDone, prSent, merged, issueClosed }`.

### 3. `engagement_log`

Tracks autonomous and manual interactions with GitHub to enforce safety and rate limits.

- `id` (UUID): Primary key.
- `user_id` (UUID): Foreign key to `users.id`.
- `repo_name` (TEXT): Format `owner/repo`.
- `action_type` (TEXT): The type of engagement (e.g. `COMMENT`, `REQUEST_ASSIGNMENT`).
- `created_at` (TIMESTAMPTZ): When the engagement occurred.

_Note: Used by the rate limiter to enforce daily limits and repository cooldowns._

### 4. `execution_locks`

A distributed locking mechanism to prevent race conditions during autonomous edge function execution or parallel manual claims.

- `lock_key` (TEXT): Primary key (e.g., `worker_lock_1234`).
- `locked_at` (TIMESTAMPTZ): When the lock was acquired.
- `expires_at` (TIMESTAMPTZ): When the lock automatically expires to prevent deadlocks.

## Migrations & Edge Functions

Database changes are versioned in `supabase/migrations/`.
Do not manually edit the schema through the Supabase Dashboard if you plan to update the application, as it will cause migration conflicts.

## Row Level Security (RLS)

Every table enforces strict Row Level Security. Users can only `SELECT`, `INSERT`, `UPDATE`, or `DELETE` rows where `user_id = auth.uid()`. Edge Functions bypass RLS where system-level operations (like global locking) are necessary, using the Service Role Key securely.
