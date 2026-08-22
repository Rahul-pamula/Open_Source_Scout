# Implementation Plan

The architecture should be built incrementally, following these specific phases to ensure stability and safety.

## Phase 0 — Foundation
*   Initialize Repository
*   React/Vite setup
*   PWA Configuration
*   Routing
*   Tactical Glass UI System
*   Supabase connection
*   Database schema setup
*   Authentication implementation

## Phase 1 — Read-Only Scout
*   GitHub connection setup
*   GitHub MCP/API integration
*   Radar UI
*   Issue discovery logic
*   Deterministic filtering rules
*   Profile matching engine
*   Groq evaluation integration
*   *(No commenting allowed in this phase)*

## Phase 2 — Dossier
*   Issue details view
*   Separation of GitHub facts vs. AI analysis
*   Match explanation UI
*   Difficulty scoring display
*   Duplicate claimant detection logic

## Phase 3 — Tracking
*   Operations UI (Contribution Tracker)
*   State machine implementation
*   Tracked issues database integration
*   Event logging
*   Generation of `state.json` and `TRACKING_BOARD.md`

## Phase 4 — Draft Engagement
*   Comment generation via Groq
*   Comment preview UI
*   Edit capabilities
*   User approval flow (L1 Autonomy)

## Phase 5 — Safe Autonomous Engagement
*   Availability check (Safety Gate)
*   Idempotency enforcement
*   Autonomy settings UI
*   Allowlists implementation
*   Automatic comment execution (L2/L3 Autonomy)

## Phase 6 — Monitoring
*   GitHub Actions scheduler setup (`sync` function)
*   Detection of maintainer responses
*   Detection of assignments
*   Detection of PR creation, reviews, and merges

## Phase 7 — Agent Toolkit
*   Define `os-scout` persona
*   Implement Scout skill logic in Python
*   Agent Loop definition
*   Local execution support (via Agent Toolkit)
*   Remote execution support (via GitHub Actions)
*   State synchronization logic

## Phase 8 — Onboarding + Feedback
*   Success stories showcase
*   Opt-in public registry
*   Feedback mechanisms
