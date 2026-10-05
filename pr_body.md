## Problem

When users click UI buttons to revert task states (e.g., "BACK TO CLAIMED" or "BACK TO ASSIGNED"), the Supabase Edge Function throws a 500 `non-2xx status code` error because backward transitions are not explicitly modeled in the edge function or database triggers. Additionally, the database had migrated to new V2 states (`QUEUED`, `ACTIVE`), but the V1 UI was still sending old V1 states (`ENGAGED`, `ASSIGNED`), leading to validation mismatches.

## Root cause

1. Edge Function and DB Trigger `validate_state_transition` lacked backward paths.
2. Mismatch between UI states and database enum (`execution_state`). The Edge Function threw `PGRST116` which bubbled up as a 500 error.

## Solution

- Added a new migration `20261005111900_relax_state_machine_reversions.sql` to explicitly allow reversions (e.g., `ACTIVE` -> `QUEUED`, `SUBMITTED` -> `ACTIVE`).
- Updated `tracking.ts` `transitions` map to support the same reversions.
- Added a transparent compatibility layer in `tracking.ts` that maps V1 UI states (e.g., `ENGAGED`, `ASSIGNED`) to V2 DB states (e.g., `ACTIVE`, `QUEUED`) on the way in, and maps them back for the UI on the way out in `getTasks`.
- Gracefully caught `400` errors resulting from `PGRST116` to prevent bubbling as `500`.

## Files changed

- `supabase/functions/_shared/tracking.ts`
- `supabase/functions/tracking/index.ts`
- `supabase/migrations/20261005111900_relax_state_machine_reversions.sql`

## Tests executed

- Validated state mappings syntactically and reviewed logic to ensure UI will resolve correctly.

## Security impact

Medium. Fixes broken authorization state logic that effectively locked issues out of state transitions.

## Breaking changes

None. Restores functionality for the frontend.

## Deployment/migration requirements

Requires running Supabase migrations.

## Rollback considerations

If UI relies on strict state validation, they might need adjustment, but this largely fixes a broken flow.

Closes #298
