#!/bin/bash

# EPIC 3 - Path Traversal Protection
gh issue create \
  --title "[Security] Implement Path Traversal Protection in MCP Server" \
  --body "## Problem
MCP tools (\`read_file\`, \`write_file\`, \`edit_file\`) currently lack strict boundary checks against relative path traversal.

## Current behavior
The tools accept any path string, potentially allowing access outside the worktree via \`../../\`.

## Desired behavior
Implement a strict path containment check in \`src/guardrails.ts\` (e.g. \`validatePathBoundary\`) that resolves the path and ensures it starts with the intended base directory. Reject \`../../\`, absolute paths, symlink escapes.

## Technical scope
packages/scout-mcp/src/guardrails.ts
packages/scout-mcp/src/index.ts

## Security implications
High. LLM could be tricked into reading/writing arbitrary host files.

## Acceptance criteria
- \`validatePathBoundary\` accurately prevents traversal.
- \`read_file\`, \`write_file\`, \`edit_file\` use this guardrail.
- Tests verify traversal is blocked.

## Required tests
Path traversal unit tests in \`guardrails.test.ts\`.

## Risk level
High (P0 - Security)

## Definition of Done
Guardrail implemented, tested, and active on all file operations." \

# EPIC 2 - RLS Audit
gh issue create \
  --title "[Security] Audit and strictly enforce RLS policies in Supabase" \
  --body "## Problem
Row Level Security (RLS) is enabled, but the actual \`CREATE POLICY\` definitions may not strictly enforce \`auth.uid() = user_id\` across all tables, or may be missing for some operations.

## Current behavior
RLS is enabled via migrations but policies need a strict audit.

## Desired behavior
Every table (\`tasks\`, \`task_sessions\`, \`integrations\`, \`tracked_issues\`) must have strict policies ensuring users can only SELECT/INSERT/UPDATE/DELETE their own data.

## Technical scope
supabase/migrations/

## Security implications
High. Cross-user data leakage or modification.

## Acceptance criteria
- All public tables have RLS enabled.
- Policies restrict access to the resource owner.
- Service-role bypass is properly understood and documented if used.

## Required tests
Database tests or explicit verification in migration.

## Risk level
High (P0 - Security)

## Definition of Done
Migrations updated or new migration added enforcing strict RLS." \

# EPIC 2 - State Machine Reversions
gh issue create \
  --title "[Bug] Fix State Machine Reversions in Edge Functions" \
  --body "## Problem
When users click UI buttons to revert task states (e.g., \"BACK TO CLAIMED\" or \"BACK TO ASSIGNED\"), the Supabase Edge Function throws a \`non-2xx status code\` error (500 Internal Server Error).

## Current behavior
Backward transitions fail with unhandled errors.

## Desired behavior
The \`update_task_state_machine.sql\` migration or the Edge Function logic must explicitly allow backward transitions (e.g., \`ASSIGNED\` -> \`CLAIMED\`, \`REVIEW\` -> \`ASSIGNED\`). The Edge Function should catch errors and return 400 Bad Request if invalid, not 500.

## Technical scope
supabase/migrations/
supabase/functions/

## Security implications
Medium (Broken authorization/state logic).

## Acceptance criteria
- UI buttons for backward transitions work.
- Edge functions return clean error payloads for invalid transitions.

## Required tests
Integration tests for backward state transitions.

## Risk level
High (P0 - Bug)

## Definition of Done
Backward transitions succeed without 500 errors." \

# EPIC 1 - XSS Hardening
gh issue create \
  --title "[Security] Harden Frontend Markdown Rendering against XSS" \
  --body "## Problem
\`react-markdown\` and \`rehype-raw\` are used to render potentially untrusted task descriptions from GitHub, creating XSS risks.

## Current behavior
Raw HTML is rendered without explicit sanitization or a strict Content Security Policy.

## Desired behavior
Implement HTML sanitization (e.g., \`rehype-sanitize\`) and configure strict CSP headers to prevent XSS execution.

## Technical scope
apps/web/src/components/ (Markdown renderers)

## Security implications
High. Malicious task descriptions could execute arbitrary JavaScript in the user's session.

## Acceptance criteria
- HTML is sanitized before rendering.
- CSP headers are documented/configured.

## Required tests
Security regression tests rendering known XSS payloads.

## Risk level
High (P0 - Security)

## Definition of Done
XSS payloads fail to execute in rendered markdown." \
