# State Machine & Synchronization

## Hierarchy of Truth
1.  **GitHub Facts:** Ground truth for external state (Is the issue open? Who is assigned? Are there new comments?).
2.  **Supabase:** Canonical source of truth for Scout's application state (User profile, evaluation scores, autonomy settings).
3.  **Generated Representations:** `state.json` and `TRACKING_BOARD.md`. These are generated from authoritative state to serve as portable agent context.

## Contribution Lifecycle

The canonical state machine for a discovered issue:

```text
DISCOVERED
    ↓
EVALUATED
    ↓
SELECTED
    ↓
SAFETY_CHECK
    ↓
COMMENT_PENDING
    ↓
COMMENTED
    ↓
AWAITING_MAINTAINER
    ↓
MAINTAINER_RESPONDED
    ↓
ASSIGNED
    ↓
CONTRIBUTING
    ↓
PR_OPEN
    ↓
UNDER_REVIEW
    ↓
CHANGES_REQUESTED
    ↓
PR_UPDATED
    ↓
MERGED
    ↓
COMPLETED
```

**Exception States:**
*   `SKIPPED`
*   `NO_LONGER_AVAILABLE`
*   `ALREADY_ASSIGNED`
*   `COMPETING_CLAIM`
*   `COMMENT_FAILED`
*   `ISSUE_CLOSED`
*   `RATE_LIMITED`

## Conflict Resolution
If `state.json` indicates an issue is `ASSIGNED`, but GitHub reports it as unassigned, GitHub always wins.
The system will:
1. Verify against GitHub.
2. Update Supabase to reflect reality.
3. Regenerate `state.json`.
4. Regenerate `TRACKING_BOARD.md`.
