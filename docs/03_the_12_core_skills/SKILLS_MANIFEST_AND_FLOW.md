# The 12 Governed Skills of Scout V2

## 1. Overview

In Scout V2, raw language models are never allowed to execute code in an ungoverned loop. Instead, execution is partitioned into **12 specialized skills** located in `.scout/skills/`.

Each skill defines strict constraints, instructions, and checklists that govern how the agent plans, modifies code, runs tests, and interacts with GitHub.

```
.scout/skills/
├── scout-orchestrator       ── The Conductor (Multi-phase state machine)
├── scout-planner            ── The Blueprint (STATE.md ledger & task breakdown)
│
├── scout-tamper-guard       ── Safety Ring (Locks edits strictly to target files)
├── scout-refactor-safe      ── Safety Ring (Guarantees behavioral and API parity)
├── scout-api-contract       ── Safety Ring (Protects client-server payload shapes)
├── scout-db-migration       ── Safety Ring (Enforces safe, non-destructive SQL migrations)
├── scout-dependency-updater ── Safety Ring (Guarantees clean lockfile & peer-dep resolution)
│
├── scout-proof-fix          ── Quality Gate (Red-Green-Refactor test verification)
├── scout-ui-tester          ── Quality Gate (Responsive design, Tailwind & accessibility)
├── scout-adversarial-review ── Quality Gate (Hostile self-critique before PR submission)
├── scout-doc-writer         ── Quality Gate (JSDoc, README updates, release notes)
│
└── scout-honest-stop        ── Circuit Breaker (Halts execution early on ambiguity or blockers)
```

---

## 2. Complete Skills Catalog & Execution Rules

### Ring 1: Orchestration & Planning

#### 1. `scout-orchestrator`

- **Role:** The Master Workflow Conductor.
- **Trigger:** `ALWAYS` (at the start of every session).
- **Rule:** Divides any engineering request into four mandatory, non-negotiable phases:
  1. _Phase 1: Exploration & Triage_ (Locate issue, verify dependencies).
  2. _Phase 2: Plan Formulation_ (Write `STATE.md`).
  3. _Phase 3: Test-Driven Fix_ (Failing test → Surgical Patch → Passing test).
  4. _Phase 4: Adversarial Audit & PR Submission_.
- **Impact:** Prevents the agent from acting like an erratic chatbot jumping straight into code editing.

#### 2. `scout-planner`

- **Role:** The Architectural Blueprint & State Ledger.
- **Trigger:** `ALWAYS`.
- **Rule:** Before any code is changed, the agent must initialize and maintain a living `STATE.md` document tracking:
  - Exact target file paths.
  - Potential side effects and downstream dependencies.
  - Step-by-step checklist of planned actions.
- **Impact:** If the agent is interrupted or encounters an error, it resumes from the `STATE.md` ledger without losing context.

---

### Ring 2: Safety & Scope Containment

#### 3. `scout-tamper-guard`

- **Role:** Strict Scope Restrictor.
- **Trigger:** Code Modification Phase.
- **Rule:** The agent is strictly prohibited from touching, modifying, formatting, or deleting any file outside the explicit target files listed in `STATE.md`.
- **Impact:** Completely eliminates the common AI disease where an agent re-formats entire unrelated files or rewires project configuration files.

#### 4. `scout-refactor-safe`

- **Role:** Behavioral Parity Enforcer.
- **Trigger:** `refactor`.
- **Rule:** When optimizing or restructuring code, the public function signature (parameters, return types, thrown exceptions) **must remain 100% identical**. No new features may be sneaked in during a refactor.
- **Impact:** Guarantees zero regression in consumer modules.

#### 5. `scout-api-contract`

- **Role:** Client-Server Synchronizer.
- **Trigger:** `backend_api`.
- **Rule:** If an Edge Function, REST endpoint, or GraphQL query payload is modified, the agent **must immediately update** the corresponding TypeScript client types (e.g. `apps/web/src/types.ts`). Deprecated fields must be preserved with fallback defaults.
- **Impact:** Prevents runtime "Undefined property" crashes between frontend and backend.

#### 6. `scout-db-migration`

- **Role:** Database Schema Protector.
- **Trigger:** `database`.
- **Rule:** Never mutate historical SQL migrations. All schema changes must be written as a new timestamped migration (`YYYYMMDDHHMMSS_name.sql`) using non-destructive syntax (`ADD COLUMN IF NOT EXISTS`, safe defaults).
- **Impact:** Prevents breaking production databases during deployments.

#### 7. `scout-dependency-updater`

- **Role:** Package Conflict Resolver.
- **Trigger:** `maintenance`.
- **Rule:** Enforces that every `package.json` modification is accompanied by a matching, tested `package-lock.json`. Peer-dependency conflicts must be resolved through exact compatibility checking rather than blind `--force` flags.

---

### Ring 3: Empirical Quality & Verification

#### 8. `scout-proof-fix`

- **Role:** Empirical Verification Gate (Red-Green-Refactor).
- **Trigger:** `bug_fix`.
- **Rule:** An agent is **forbidden** from declaring a bug fixed unless it can prove it via an automated test:
  1. **Red:** Write or run a unit test reproducing the bug. Verify the test fails.
  2. **Green:** Apply the surgical fix using `edit_file`. Verify the test passes.
  3. **Regression:** Run the complete workspace test suite.
- **Impact:** Eliminates false "Fix complete!" claims that don't compile.

#### 9. `scout-ui-tester`

- **Role:** Frontend Presentation & Accessibility Validator.
- **Trigger:** `frontend_ui`.
- **Rule:** When editing UI components, the agent must verify:
  - Responsive breakpoints (Tailwind `sm:`, `md:`, `lg:`).
  - Accessibility (`aria-labels`, semantic HTML, keyboard navigability).
  - Dark mode and high-contrast color parity.

#### 10. `scout-adversarial-review`

- **Role:** Internal Hostile Code Reviewer.
- **Trigger:** Pre-Submission (`submit_for_review`).
- **Rule:** Before creating a Pull Request, the agent switches persona and acts as an aggressive reviewer arguing _against_ its own code. It searches for:
  - Concurrency race conditions.
  - Memory or event listener leaks.
  - Security vulnerabilities (XSS, injection).
- **Impact:** Catches subtle logic flaws before any human reviewer sees the PR.

#### 11. `scout-doc-writer`

- **Role:** Documentation & Telemetry Synchronizer.
- **Trigger:** `new_feature` or `API change`.
- **Rule:** Generates accurate TSDoc/JSDoc comments for all new functions, updates the `README.md` or relevant architectural guides, and writes clear, human-readable PR descriptions.

---

### Ring 4: Circuit Breakers & Economic Guards

#### 12. `scout-honest-stop`

- **Role:** Autonomous Circuit Breaker.
- **Trigger:** Ambiguity, Missing Credentials, or 3 Consecutive Test Failures.
- **Rule:** When the agent cannot determine the correct path forward with high confidence, **it must immediately stop execution**.
  - It calls `mark_blocked` on the Scout MCP server.
  - It records a structured blocker report: root cause, files inspected, and the exact question or credential required.
- **Impact:** **Stops infinite loops and saves developer money.** Instead of burning \$5 in tokens trying random guesses, it halts cleanly and leaves an isolated, inspectable worktree.
