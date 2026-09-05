## Summary

<!-- One-line description of the change -->

## What it does

- Briefly summarize the change and the files/components touched.

## Why this change

- Explain the rationale: bugfix, feature, documentation, refactor, etc.

## Steps to test

1. Build and run the web app: `cd apps/web && npm install && npm run dev`
2. Visit the Setup page and confirm the new GitHub OAuth instructions appear.
3. Visit the Connect page and confirm the Connection helper displays stored project and offers Test OAuth / Copy Test URL actions.

## Migration / Deployment notes

- No database migrations.
- Frontend change only; deploy static site after merge to make instructions live.

## Security considerations

- Do not include any secrets in the PR. The GitHub Client Secret and Supabase service_role key must never be committed.

## Checklist

- [ ] Code compiles and tests pass
- [ ] Changes documented (Setup/Connect pages updated)
- [ ] No secrets committed
- [ ] Manual smoke test completed

## PR Notes

- This PR adds UI guidance and helper flows to make it simpler for users to register a GitHub OAuth App and configure Supabase. It does not change backend logic or secret handling.
