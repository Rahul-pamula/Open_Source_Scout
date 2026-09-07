# Architecture: Open Source Scout (BYOB)

## Vision

Open Source Scout is an autonomous open-source contribution discovery and engagement agent.

The fundamental product philosophy is: **Scout, don't code.**
The Scout Agent discovers and manages the contribution workflow, but the user performs the actual software implementation.

Crucially, Open Source Scout operates on a **Bring Your Own Backend (BYOB)** model. There are zero central servers. Every user owns their own backend infrastructure, ensuring 100% data sovereignty.

## BYOB Architecture

The system eliminates traditional backend APIs in favor of a universal static frontend connecting dynamically to self-hosted serverless environments.

```text
                OPEN SOURCE SCOUT
                       │
         ┌─────────────┴─────────────┐
         │                           │
    STATIC FRONTEND          USER'S PERSONAL BACKEND
         │                           │
    React PWA (Universal)       Supabase PostgreSQL
    Deployed on GitHub Pages    Supabase Edge Functions
    localStorage Keys           Secure Vault (Secrets)
         │                           │
         └─────────────┬─────────────┘
                       │
                  External APIs
                       │
              GitHub & Groq (LLMs)
```

## Core Components

1. **Frontend**: React + Vite. This is a single, static web app hosted centrally. It acts purely as a UI layer.
2. **Edge Functions**: The primary security boundary and backend logic. Written in Deno, they handle GitHub API calls, Groq evaluation, deterministic filtering, and database updates.
3. **Database**: The user's personal Supabase PostgreSQL instance is the canonical source of truth for their application state (profiles, evaluations, engagement history).

## The Pipeline Lifecycle & Optimistic UI

The Mission Control pipeline is driven by a state machine tracking the lifecycle of an issue:

`DISCOVERED` ➔ `EVALUATED` ➔ `DRAFTED` ➔ `ENGAGED` ➔ `ASSIGNED` ➔ `COMPLETED`

_(Issues can also be marked `REJECTED` at any point, and optionally restored back to `ENGAGED` later)._

### Client-Driven Automation

Rather than relying on a heavy server-side background worker, automation is **client-driven**.
The frontend `handleAutomateProcess` orchestrates the loop:

1. Grabs a batch of `DISCOVERED` issues.
2. Locks the issue by setting its state to `DRAFTED` in the database.
3. Invokes the `engage` edge function to post the claim comment on GitHub.
4. Updates the state to `ENGAGED` upon success.
   This ensures the user's browser stays in control of the pace and visibility of the automation.

### Optimistic UI

The frontend employs an **Optimistic UI** architecture for a fast user experience.
When a user manually moves an issue across the pipeline (e.g. `ENGAGED` ➔ `ASSIGNED`), the frontend:

1. Immediately updates the local React state so the UI reacts instantly.
2. Registers a `pendingIssues` lock to prevent duplicate user interactions.
3. Sends the state update to Supabase.
4. Protects the local state against stale `fetchPipeline` asynchronous responses overwriting the new optimistic state.
5. Rolls back the UI if the backend request fails.

## Security & Secrets

- **Public Keys:** The `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are stored in the browser's `localStorage`. They are public by design.
- **Row Level Security (RLS):** The database enforces strict RLS. The Anon Key is useless without a valid GitHub OAuth session.
- **Private Secrets:** `GITHUB_TOKEN` and `GROQ_API_KEY` are never exposed to the frontend. They are stored in the Supabase Vault.
