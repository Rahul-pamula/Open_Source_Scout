# Security Architecture

## Principle
The browser is **never trusted with third-party secrets**. The system uses Supabase Edge Functions as the primary security boundary.

```text
                    Browser
                       │
                       │ HTTPS
                       ▼
              Supabase Edge Function
                       │
              ┌────────┴────────┐
              ▼                 ▼
         Supabase Vault       PostgreSQL
              │
              ▼
       Secret Retrieval
              │
       ┌──────┴───────┐
       ▼              ▼
    GitHub API       Groq
```

## Progressive Autonomy
Scout operates under strict autonomy controls, escalating only with user permission:
*   **L0 (Observation):** Read only. Search, analyze, recommend. No mutations.
*   **L1 (Draft):** Discover, evaluate, generate comment draft. User must explicitly approve.
*   **L2 (Allowlisted Engagement):** Autonomous comments allowed only within specific constraints (e.g., specific repos, >85% match).
*   **L3 (Autonomous Scout):** Fully autonomous discovery, evaluation, and commenting within user-defined bounds.

## Engagement Safety Gate
Before any automated GitHub comment, Scout must pass this gate:
1. Fetch latest issue
2. Check if open
3. Check assignment
4. Fetch recent comments (check for competing claimants)
5. Check duplicate engagement
6. Check autonomy permission
7. Generate comment
8. Final validation
9. POST comment

If any check fails, the state becomes `NO_LONGER_AVAILABLE`.

## Idempotency
To prevent duplicate requests and spamming maintainers:
*   An `engagement_identity` is generated via SHA-256 hash of `[user_id, repository_owner, repository_name, issue_number, engagement_type]`.
*   Stored with a unique database constraint.

## Zero Telemetry
The system respects user privacy. No silent telemetry is sent to the maintainer (including GitHub usernames, repos, issues, or API keys). Public success stories are strictly opt-in.
