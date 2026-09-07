# State Machine & Synchronization

## Hierarchy of Truth

1. **GitHub Facts:** Ground truth for external state (Is the issue open? Who is assigned? Are there new comments?).
2. **Supabase (`tracked_issues`):** Canonical source of truth for Scout's application state (Where the issue is in your pipeline, contribution checklist).
3. **Optimistic Local State:** The React frontend uses an optimistic UI to instantly reflect state transitions while syncing them with Supabase in the background.

## Contribution Lifecycle (Mission Control)

The canonical state machine for a tracked issue is strictly enforced by the `tracking` Edge Function:

```text
DISCOVERED
    ↓
EVALUATED
    ↓
DRAFTED
    ↓
ENGAGED  <┈┈┈╮ (Restore)
    ↓        │
ASSIGNED     │
    ↓        │
COMPLETED    │
             │
REJECTED ┈┈┈┈╯
```

### State Definitions

- **`DISCOVERED`**: The issue was found by a GitHub search query but hasn't been evaluated yet.
- **`EVALUATED`**: The Groq LLM has evaluated the issue and assigned a match score. It appears in the Discovery tab.
- **`DRAFTED`**: A temporary lock state while an auto-claim or manual claim is being processed.
- **`ENGAGED`**: A claim comment has been posted to GitHub. The issue appears in the Claimed tab.
- **`ASSIGNED`**: The maintainer has responded positively (detected via the `claimDetector` AI) or you manually marked it assigned. Unlocks the Contribution Checklist.
- **`COMPLETED`**: The PR is merged and the issue is resolved.
- **`REJECTED`**: The issue was dropped or closed.

### Dropped & Restored

If an issue is in `REJECTED`, the user can use the **Restore** action to return it to the active pipeline. The strict state machine validation allows a transition from `REJECTED` back to `ENGAGED`.

## Edge Function Synchronization

A background `pg_cron` job continuously monitors your active pipeline (`ENGAGED` issues) via the `global-sync` Edge Function.

If a maintainer replies:

1. Scout fetches the new comments.
2. Passes the reply through the AI Claim Analyzer (`claimDetector`).
3. If permission is granted (e.g., "Go ahead!"), it automatically transitions the state to `ASSIGNED`.
4. If permission is denied, it moves the state to `REJECTED`.
