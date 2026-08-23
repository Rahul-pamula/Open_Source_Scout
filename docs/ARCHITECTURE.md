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
1. **Frontend**: React + Vite PWA. This is a single, static web app hosted centrally. It acts purely as a UI layer.
2. **Edge Functions**: The primary security boundary and backend logic. Written in Deno, they handle GitHub API calls, Groq evaluation, deterministic filtering, and database updates.
3. **Database**: The user's personal Supabase PostgreSQL instance is the canonical source of truth for their application state (profiles, evaluations, engagement history).
4. **Deployment CLI**: A Node.js CLI (`packages/cli`) that orchestrates the IaC (Infrastructure as Code) deployment of the database schema and edge functions to the user's personal Supabase project.

## Discovery Pipeline (Edge Execution)
When the user clicks "Search" on the frontend, it invokes the `search` Edge Function:
1. Natural Language Request & Intent Extraction
2. GitHub Search (Raw Candidates)
3. Deterministic Filtering (reject closed, assigned, archived, duplicates)
4. Groq Evaluation (skill fit, difficulty, relevance)
5. Ranked Candidates returned to the static UI

## Security & Secrets
- **Public Keys:** The `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are stored in the browser's `localStorage`. They are public by design.
- **Row Level Security (RLS):** The database enforces strict RLS. The Anon Key is useless without a valid GitHub OAuth session.
- **Private Secrets:** `GITHUB_TOKEN` and `GROQ_API_KEY` are never exposed to the frontend. The Deployment CLI pushes them directly into the Supabase Vault.

## The Open UX Challenge
Currently, if a user clears their browser cache or uses Incognito mode, `localStorage` is wiped, and they must re-enter their Supabase URL and Anon Key. Solving this decentralized connection paradigm—without resorting to a central registry—is our primary architectural challenge.
