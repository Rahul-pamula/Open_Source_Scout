# Stop Wasting Time Scrolling GitHub: We Built an AI Agent to Hunt Open Source Issues and Claim Them for You

## 1. The Problem We Were Trying to Solve

Open-source contribution is historically a manual, highly fragmented process broken into two major pain points:

**1. The Discovery & "Ghosting" Pipeline**
Searching "good first issue" on GitHub yields millions of noisy results. A contributor spends hours finding a relevant issue, leaves a comment to claim it, and then waits. Maintainers are busy, so a reply might take a day, a week, or a month. Because of this extreme asynchronous delay, the contributor loses context, forgets about the issue, and abandons the contribution entirely.

**2. The "Proof of Work" Amnesia**
Even when a contribution is successfully merged, developers immediately move on. Months later—when sitting in an engineering interview or trying to build a portfolio to prove their skills—they realize they have completely lost track of the complex issues they actually solved.

Furthermore, existing centralized discovery platforms that attempt to automate this face scaling costs and massive privacy concerns when requesting high-privilege GitHub tokens from users.

## 2. Project Overview

Open Source Scout is an autonomous, Bring-Your-Own-Backend (BYOB) AI agent that proactively discovers, evaluates, and tracks open-source contribution opportunities. It operates as a structured, agentic pipeline driven by LLM evaluation and decentralized serverless edge functions to assist developers in finding and engaging with issues that match their skills and intent.

## 3. Design Philosophy

**"Scout, don't code."**
The agent manages discovery, evaluation, and engagement workflows, but the human performs the actual software engineering. Additionally, the project strictly adheres to a **Decentralized BYOB** model, prioritizing 100% data sovereignty, zero central server costs, and strict human-in-the-loop control for external platform engagement.

## 4. System Architecture

**PROBLEM:** Centralized platforms holding GitHub tokens are prime security targets and incur heavy compute costs.
**WHY SIMPLE APPROACH FAILED:** A traditional monolithic backend requires constant scaling, centralizes security risk, and limits user control.
**DESIGN DECISION:** A universal static frontend connecting dynamically to self-hosted serverless environments.
**HOW THE SYSTEM WORKS CONCEPTUALLY:** The frontend is a React SPA on GitHub Pages. The backend is a personal Supabase PostgreSQL instance with Deno Edge Functions.
**WHY THIS DESIGN:** Eliminates central infrastructure costs and ensures users retain full ownership of their data and API keys.
**TRADE-OFF:** Increased friction during initial setup.
**LIMITATION:** Relies on the user maintaining their own Supabase instance.
**LESSON:** Decentralized architecture is highly effective for agentic tools requiring privileged access, provided the setup developer experience is abstracted away.

## 5. BYOB / Data Sovereignty

**PROBLEM:** Storing user GitHub tokens and Groq API keys centrally creates unacceptable privacy and security risks.
**DESIGN DECISION:** Bring-Your-Own-Backend (BYOB).
**HOW THE SYSTEM WORKS CONCEPTUALLY:** Each user provisions their own database and microservices using a dedicated CLI. The frontend only stores public connection keys in `localStorage`.
**TRADE-OFF:** If a user clears their cache, they must reconnect their instance manually.

## 6. Serverless Microservice Architecture

**PROBLEM:** Monolithic backends are fragile; an LLM timeout shouldn't break GitHub syncing.
**DESIGN DECISION:** Backend decomposed into 7 isolated Deno Edge Functions (`search`, `evaluate`, `tracking`, `dossier`, `engage`, `sync`, `worker`).
**HOW THE SYSTEM WORKS CONCEPTUALLY:** Each function has a distinct failure boundary. For instance, evaluation failures do not prevent basic search operations.
**WHY THIS DESIGN:** Isolation of responsibilities, security boundaries, and near-instant scaling.

## 7. Agentic Workflow

Scout models an agentic pipeline rather than a chat interface:

1. **Discovery**: Batch processing of issues.
2. **Evaluation**: Filtering and scoring.
3. **Selection**: User curation.
4. **Safety Check**: Pre-engagement validation.
5. **Engagement**: Drafting and posting comments.
6. **Monitoring**: Detecting assignments and PR merges.
7. **Completion**: Archiving successful contributions.

## 8. AI + Deterministic Hybrid Architecture

**PROBLEM:** Evaluating every GitHub issue with an LLM is slow and expensive.
**WHY SIMPLE APPROACH FAILED:** Pure LLM filtering hits rate limits and wastes compute on closed or assigned issues.
**DESIGN DECISION:** Deterministic filtering precedes AI evaluation.
**HOW THE SYSTEM WORKS CONCEPTUALLY:** The edge function first discards closed, assigned, archived, or duplicate issues using fast, deterministic logic before passing the pruned list to the Groq LLM for skill evaluation.
**WHY THIS DESIGN:** Dramatically reduces token cost and latency.

## 9. Contributor–Issue Matching

The pipeline filters raw GitHub candidates by matching the issue body and metadata against the user's explicit profile, skills, and current intent. The LLM produces a match score, difficulty rating, and relevance explanation to help the user decide whether to engage.

## 10. LLM Evaluation

**PROBLEM:** Real-time list filtering requires extreme speed.
**DESIGN DECISION:** Utilize Groq's LPU architecture (LLaMa3-8B).
**HOW THE SYSTEM WORKS CONCEPTUALLY:** The `evaluate` edge function passes batched issues (max 5 per batch) to Groq.
**LIMITATION:** Hard cost boundaries limit batch sizes to prevent abuse and exhaustion of free-tier limits. (IMPLEMENTED AND VERIFIED).

## 11. Dossier and Explainability

**PROBLEM:** LLMs hallucinate context.
**DESIGN DECISION:** Strict separation of GitHub Facts vs. AI Analysis in the UI.
**HOW THE SYSTEM WORKS CONCEPTUALLY:** The UI distinctly renders undeniable metadata (e.g., "Last updated 2 hours ago") separately from the AI's subjective reasoning (e.g., "High match due to React experience").
**WHY THIS DESIGN:** Builds trust and provides clear human verification boundaries.

## 12. Human-in-the-Loop Autonomy

**PROBLEM:** Fully autonomous agents can spam maintainers, damaging open source communities.
**DESIGN DECISION:** Progressive Autonomy controls.
**HOW THE SYSTEM WORKS CONCEPTUALLY:** Scout operates at L1 (Drafting) by default, requiring explicit human clicks to post comments. L2 (Bounded Autonomy) uses allowlists, while L3 is strictly bounded by safety gates.

## 13. Safe Engagement Architecture

**PROBLEM:** Race conditions where an agent comments on an issue that was just closed or assigned.
**DESIGN DECISION:** The Engagement Safety Gate.
**HOW THE SYSTEM WORKS CONCEPTUALLY:** Before the `engage` edge function posts a comment, it re-fetches the live GitHub state, verifies assignment status, checks rate limits, acquires an idempotency lock, and validates intent.

## 14. Maintainer Response and Claim Detection

**PROBLEM:** Detecting when a user is "assigned" to an issue when maintainers often don't use official GitHub assignment UI features.
**DESIGN DECISION:** AI Claim Analyzer.
**HOW THE SYSTEM WORKS CONCEPTUALLY:** Background sync detects new maintainer comments and passes them to an LLM to interpret intent (e.g., "Go ahead and open a PR" translates to `ASSIGNED`).
**LIMITATION:** False positives are possible. (IMPLEMENTED BUT NOT EMPIRICALLY BENCHMARKED for accuracy across large datasets).

## 15. Contribution State Machine

**PROBLEM:** Simple boolean flags cannot capture the complexity of an external PR lifecycle.
**DESIGN DECISION:** A 16-state finite state machine.
**HOW THE SYSTEM WORKS CONCEPTUALLY:** States transition strictly (e.g., `DISCOVERED` -> `EVALUATED` -> `ENGAGED` -> `ASSIGNED` -> `COMPLETED`), with exception states (`COMPETING_CLAIM`, `ISSUE_CLOSED`) handling failure paths.

## 16. External State Reconciliation

**PROBLEM:** The local database state falls out of sync with external GitHub reality.
**DESIGN DECISION:** GitHub is the ultimate ground truth.
**HOW THE SYSTEM WORKS CONCEPTUALLY:** If a conflict occurs (e.g., local state says `ASSIGNED`, but GitHub shows closed), the sync function forcibly overwrites the local state to match GitHub.

## 17. Background Synchronization

**PROBLEM:** SPAs only update when the user is active.
**DESIGN DECISION:** `global-sync` edge function triggered by Supabase `pg_cron`.
**HOW THE SYSTEM WORKS CONCEPTUALLY:** A cron job continuously monitors active pipelines, detecting maintainer replies and PR merges while the user is offline.

## 18. Authentication and Authorization

**PROBLEM:** Securing edge functions without central servers.
**DESIGN DECISION:** Stateless JWT Verification.
**HOW THE SYSTEM WORKS CONCEPTUALLY:** Edge functions require a valid Supabase session JWT in the Authorization header. Functions use a shared `requireAuth` module to cryptographically verify the token before proceeding.

## 19. Database Security and RLS

**PROBLEM:** In a multi-tenant or shared configuration, users must not access each other's tracked issues.
**DESIGN DECISION:** PostgreSQL Row Level Security (RLS).
**HOW THE SYSTEM WORKS CONCEPTUALLY:** Strict RLS policies inject the authenticated user's ID into the query context. Verified via `pgTAP` automated tests in `00_schema_and_rls.test.sql`.

## 20. Secret Management

**PROBLEM:** Preventing accidental commit or exposure of high-privilege tokens.
**DESIGN DECISION:** Strict isolation using Supabase Vault and temporary files.
**HOW THE SYSTEM WORKS CONCEPTUALLY:** The CLI creates an `.env.temp` file, pushes secrets via `supabase secrets set`, and guarantees deletion using a `try...finally` block, even on process crashes.

## 21. Invisible Setup CLI

**PROBLEM:** Provisioning a BYOB environment for non-technical users or without distributing source code manually.
**DESIGN DECISION:** An "invisible clone" NPM setup wizard (`packages/cli`).
**HOW THE SYSTEM WORKS CONCEPTUALLY:** The CLI shallow-clones the repo to `.scout-tmp`, extracts schemas and edge functions, deploys them to the user's Supabase instance, and instantly deletes the temporary directory.
**LIMITATION:** The CLI cannot currently configure Supabase Authentication Site URLs or Redirect URIs programmatically, meaning users still have to perform one manual dashboard step before OAuth logins work.

## 22. Failure Handling and Graceful Degradation

**PROBLEM:** Missing profiles during first-time login crash the application.
**DESIGN DECISION:** Defensive querying.
**HOW THE SYSTEM WORKS CONCEPTUALLY:** The frontend uses `.maybeSingle()` for reading missing data, preventing fatal `406 Not Acceptable` errors from PostgREST, and gracefully downgrades the UI until the profile is completed.

## 23. Idempotency and Concurrency

**PROBLEM:** Duplicate network retries could result in duplicate comments on a GitHub issue.
**DESIGN DECISION:** Idempotency locks in the database.
**HOW THE SYSTEM WORKS CONCEPTUALLY:** An `engagement_identity` hash is generated and locked during the `engage` edge function. Subsequent identical requests fail safely.

## 24. Rate Limiting and Abuse Prevention

**PROBLEM:** Edge functions could be spammed, exhausting Groq API budgets.
**DESIGN DECISION:** `rateLimiterService`.
**HOW THE SYSTEM WORKS CONCEPTUALLY:** Edge functions enforce strict maximum evaluation limits per request and autonomous daily limits.

## 25. CI/CD and Quality Engineering

**PROBLEM:** Regressions in the CLI or database schema could destroy the BYOB setup flow.
**DESIGN DECISION:** GitHub Actions CI pipeline.
**HOW THE SYSTEM WORKS CONCEPTUALLY:** Automated tests (`node:test`) emulate CLI failures. `pgTAP` verifies RLS. Linting prevents syntax regressions.

## 26. Security Audit

**PROBLEM:** Future contributors might accidentally commit tokens.
**DESIGN DECISION:** Custom `security-audit.js` script in CI.
**HOW THE SYSTEM WORKS CONCEPTUALLY:** Automatically scans git history and current tree for credential patterns (`ghp_`, `gsk_`) and enforces `.gitignore` protections.

## 27. Static Frontend and GitHub Pages

**PROBLEM:** GitHub pages returns 404s for client-side React Router paths on refresh.
**DESIGN DECISION:** The 404.html hack.
**HOW THE SYSTEM WORKS CONCEPTUALLY:** The build script copies `index.html` to `404.html`. GitHub serves this file on unrecognized routes, allowing React Router to correctly mount the view.

## 28. Portable State and Generated Representations

**PROBLEM:** The system state needs to be transparent and portable for other external AI agents.
**DESIGN DECISION:** Generated `state.json` and `TRACKING_BOARD.md`.
**HOW THE SYSTEM WORKS CONCEPTUALLY:** Authoritative Supabase state is continuously compiled into flat markdown/JSON representations.

## 29. Developer Experience

**PROBLEM:** Managing local dependencies across multiple workspaces (React vs CLI vs Supabase).
**DESIGN DECISION:** Modular repository structure without a root `package.json`, isolated `npm install` requirements, and clear documentation.

## 30. Important Engineering Trade-offs

- **BYOB Setup Friction vs. Privacy:** We sacrificed a 1-click onboarding experience for absolute data privacy and zero centralized cost.
- **Deterministic Filtering vs. AI Comprehension:** We reject issues purely on deterministic metadata before AI sees them, prioritizing cost/latency over edge-case AI discovery.
- **Static Hosting vs. SSR:** Chose GitHub Pages static hosting for $0 cost over Next.js SSR, necessitating the 404 router hack.

## 31. Problems We Encountered

- CLI crashing leaving `.env.temp` files exposed on disks.
- Partial database deployments throwing `42710` (Already exists) errors confusing users.
- First-time OAuth users experiencing app crashes due to missing profile rows.

## 32. Problems We Solved

- Hardened CLI with `try...finally` cleanup.
- Intercepted Supabase CLI stderr to provide specific recovery instructions for `42710` errors.
- Implemented `.maybeSingle()` graceful degradation for PostgREST.
- Idempotency locks to prevent duplicate GitHub comments.

## 33. Problems That Remain

- `localStorage` eviction on the frontend forces users to re-enter BYOB keys.
- AI Claim Detection false-positive rate is unmeasured at scale.

## 34. What Makes Scout Different

Unlike standard AI coding assistants (which write code in the IDE), Scout is a workflow agent. It solves the _discovery and communication_ friction of open source, operating independently in the cloud while leaving the actual coding to the human. Its 100% decentralized BYOB architecture is highly novel for agentic platforms.

## 35. Strongest Technical Contributions

1. The "Invisible Clone" BYOB Setup CLI.
2. The Engagement Safety Gate (Idempotency + State verification).
3. AI Claim Detection (Translating unstructured maintainer text to FSM state).
4. Edge Function Microservice decoupling.
5. Strict Separation of Facts vs. AI Analysis in the UI Dossier.

## 36. Potential Research Questions

- How accurately can LLMs classify implicit maintainer assignments compared to explicit GitHub API assignments?
- Does deterministic pre-filtering significantly degrade discovery quality compared to evaluating all issues?
- How does a BYOB deployment model impact user retention compared to centralized SaaS?

## 37. What Has Actually Been Demonstrated

- IMPLEMENTED AND VERIFIED: BYOB deployment, Edge Function execution, RLS security, Idempotent engagement, deterministic filtering, graceful DB degradation.

## 38. What Has NOT Been Demonstrated

- DOCUMENTED DESIGN: Fully autonomous (L3) engagement at scale.
- NOT EMPIRICALLY BENCHMARKED: The exact precision/recall of the AI Claim Detector across diverse repositories.

## 39. Limitations

- Requires the user to manually provision a Supabase project.
- Vulnerable to GitHub API rate limits on the user's personal token.

## 40. Future Research / Evaluation

- Benchmarking the AI Claim Detector against a dataset of 1,000 human-annotated issue threads.
- Evaluating the impact of L2 Bounded Autonomy on maintainer satisfaction.

## 41. Complete Technical Feature Inventory

- **HIGH:** BYOB Setup CLI, Engagement Safety Gate, AI Claim Detection, Edge Microservices, Hybrid Filtering, RLS Isolation.
- **MEDIUM:** Dossier Separation, Idempotency Locks, Graceful Degradation, GitHub Pages Router Hack.
- **LOW:** Portable State Generation, Security Audit Scripts.

## 42. Final Technical Narrative

Open Source Scout demonstrates that sophisticated, agentic workflows can be deployed without centralized infrastructure. By utilizing a Bring-Your-Own-Backend architecture, edge computing, and strict human-in-the-loop state machines, the project achieves data sovereignty and high reliability. The architecture explicitly balances the unpredictability of LLMs against hard deterministic safety gates, ensuring that the agent remains helpful without becoming a spam vector in the open-source ecosystem.
