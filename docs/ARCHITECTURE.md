# Architecture: Open Source Scout

## Vision
Open Source Scout is an autonomous open-source contribution discovery and engagement agent that transforms the user's intent into suitable GitHub contribution opportunities.

The fundamental product philosophy is: **Scout, don't code.**
The Scout Agent discovers and manages the contribution workflow, but the user performs the actual software implementation.

## Hybrid Architecture
The system combines a traditional robust web application with agentic workflows.

```text
                OPEN SOURCE SCOUT
                       │
         ┌─────────────┴─────────────┐
         │                           │
    PRODUCT LAYER                AGENT LAYER
         │                           │
    React PWA                   Scout Persona
    Supabase                    Scout Skill
    PostgreSQL                  GitHub MCP
    Edge Functions              Agent Toolkit
    Vault                       Skill Matching
    GitHub Actions              Progressive Autonomy
         │                           │
         └─────────────┬─────────────┘
                       │
                  GitHub API
                       │
                    GitHub
```

## Core Components
1. **Frontend**: React + Vite PWA hosted on GitHub Pages. Handles UI, auth state, Radar interface, and user approvals.
2. **Backend**: Supabase Edge Functions. The primary security boundary. Handles GitHub API calls, Groq evaluation, deterministic filtering, and database updates.
3. **Database**: Supabase PostgreSQL is the canonical source of truth for Scout's application state (profiles, evaluations, engagement history).
4. **Agent State**: `state.json` (machine-readable) and `TRACKING_BOARD.md` (human-readable) serve as portable agent state that can be operated on locally or via GitHub Actions.

## Discovery Pipeline
1. Natural Language Request
2. Intent Extraction (Groq)
3. GitHub Search / MCP (Raw Candidates)
4. Deterministic Filtering (reject closed, assigned, archived, duplicates, competing claims)
5. Skill Matching (Profile vs. Repository)
6. Groq Evaluation (skill fit, difficulty, relevance)
7. Ranked Candidates

## Reusable GitHub Skills
The architecture utilizes Agent Toolkit-compatible skills (e.g., `os-scout`) for local and remote execution, leveraging GitHub MCP for discovery and the GitHub API for mutations.
