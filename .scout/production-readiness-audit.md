# Scout 2.0 Production Readiness Audit

## 1. Current Architecture

- **Monorepo:** Uses npm workspaces (`apps/*`, `packages/*`, `supabase/functions/*`).
- **Scout MCP Server (`packages/scout-mcp`):**
  - Entirely offline, local-first execution engine.
  - Implements tools: `initialize_execution`, `read_file`, `write_file`, `edit_file`, `run_command`, `cancel_session`, `cleanup_session`, `submit_for_review`, `mark_blocked`, `session_heartbeat`.
  - Uses Zod for basic input schema validation but relies on local files/git for state.
  - State is persisted locally via `localState.ts` (JSON/Markdown).
  - Uses `tsup` for building ESM modules, published via `npm`.
- **Frontend Dashboard (`apps/web`):**
  - BYOB (Bring Your Own Backend) architecture.
  - Users input `SUPABASE_URL` and `SUPABASE_ANON_KEY` manually via UI (stored in `localStorage`).
  - GitHub OAuth integration.
  - Built with Vite, React, TailwindCSS.
- **Backend/Supabase (`supabase/`):**
  - PostgreSQL database handling Tasks, Task Sessions, Integrations.
  - Uses RLS for data isolation.
  - Edge Functions intended for Webhook intakes and state machine transitions.

## 2. Production Risks

- **Path Traversal:** MCP tools (`read_file`, `write_file`, `edit_file`) currently lack strict boundary checks against relative path traversal.
- **Unsandboxed Commands:** `run_command` can execute arbitrary commands on the host machine.
- **XSS in Frontend:** `react-markdown` and `rehype-raw` are used to render potentially untrusted task descriptions from GitHub, creating XSS risks without proper CSP or sanitization.
- **State Machine Reversions:** Edge Functions handling state transitions (e.g. `ASSIGNED` -> `CLAIMED`) fail with 500 errors.
- **Missing Core Skills:** Crucial execution skills (`scout-planner`, `scout-proof-fix`, `scout-run-tests`) do not exist yet. The dynamic mapping of these skills is also missing.
- **Inefficient Skill Loading:** `skills.ts` blindly loads files from the top-level directory without scanning subdirectories properly or intelligently pruning based on task type.

## 3. Existing Protections

- **BYOB Frontend:** No hardcoded secrets in the web dashboard repository.
- **Zod Validation:** Exists for MCP input schemas in `src/index.ts`.
- **CommandBoundaryGuard:** Exists in `guardrails.ts`, though its effectiveness needs verification.
- **RLS Policies:** Defined in Supabase migrations (but requires a strict audit).

## 4. Missing Protections

- Full Path Traversal containment in `skills.ts` and file operations.
- Cryptographic verification of GitHub Webhooks in Edge Functions.
- React Error Boundaries in `apps/web`.
- Deterministic Fallbacks for invalid LLM tool arguments (e.g., hallucinated issue types).
- Resilient `STATE.md` parser that tolerates formatting errors.
- CLI strict `engines` requirement in `package.json`.

## 5. Recommended Implementation Order

1. **P0:** Security and Integrity
   - Implement Path Traversal Protection.
   - Audit and strictly enforce RLS policies in Supabase.
   - Implement Webhook Signature Verification.
   - XSS Hardening and CSP in Frontend.
   - Fix State Machine Reversion bugs (500 errors).
2. **P1:** Reliability and Execution
   - Implement missing Core Skills and Skill Mapping (Planner, Proof-fix, etc.).
   - Resilient `STATE.md` parsing.
   - Global and Task-level Error Boundaries in Frontend.
   - Zod argument validation refinements (Deterministic fallbacks).
   - MCP Package Distribution readiness.
3. **P2:** Performance and Efficiency
   - `scout init` scaffolding.
   - Skill caching and Context Pruning.
   - Skill Linter.
