BEGIN;
SELECT plan(10);

-- 1. Test tables exist
SELECT has_table('public', 'users', 'Table users should exist');
SELECT has_table('public', 'tracked_issues', 'Table tracked_issues should exist');

-- 2. Test enum exists
SELECT has_type('public', 'issue_state', 'Type issue_state should exist');

-- 3. Test RLS is enabled
SELECT is_empty(
  $$ SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false AND tablename IN ('users', 'tracked_issues') $$,
  'RLS should be enabled on users and tracked_issues'
);

-- Prepare mock users in auth schema for RLS testing
-- Use standard Postgres UUIDs
INSERT INTO auth.users (id) VALUES ('00000000-0000-0000-0000-000000000001');
INSERT INTO auth.users (id) VALUES ('00000000-0000-0000-0000-000000000002');

-- Switch to authenticated role
SET LOCAL role authenticated;

-- Test isolation: User 1
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';
INSERT INTO public.users (id, display_name) VALUES ('00000000-0000-0000-0000-000000000001', 'User A');
SELECT results_eq(
    'SELECT display_name FROM public.users',
    $$VALUES ('User A'::text)$$,
    'User 1 should see only their own user record'
);

-- Test isolation: User 2
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000002", "role": "authenticated"}';
INSERT INTO public.users (id, display_name) VALUES ('00000000-0000-0000-0000-000000000002', 'User B');
SELECT results_eq(
    'SELECT display_name FROM public.users',
    $$VALUES ('User B'::text)$$,
    'User 2 should see only their own user record'
);

-- Back to User 1, verify User 2's data is invisible
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';
SELECT results_eq(
    'SELECT display_name FROM public.users',
    $$VALUES ('User A'::text)$$,
    'User 1 should STILL only see their own user record'
);

-- Now test tracked_issues
INSERT INTO public.tracked_issues (user_id, github_issue_url, title, repo_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'url1', 'Issue 1', 'repo1');

SELECT results_eq(
    'SELECT title FROM public.tracked_issues',
    $$VALUES ('Issue 1'::text)$$,
    'User 1 can see their own tracked issue'
);

-- Check triggers
SET LOCAL role postgres;
SELECT has_function('public', 'update_modified_column', 'Update modtime trigger function exists');

SELECT * FROM finish();
ROLLBACK;
