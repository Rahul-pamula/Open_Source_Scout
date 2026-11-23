# Coding Standards & Security Guidelines

Welcome! To ensure code quality, repository health, security, and a seamless developer experience, all contributors (human and AI agents) must adhere to these coding standards when contributing to **Open Source Scout**.

---

## 1. 🚨 Zero Secrets & Environment Variable Policy (CRITICAL)

Security is paramount. Leaking secrets breaks trust and compromises production infrastructure.

### Rules:

1. **NEVER Hardcode Secrets:** Never commit API keys, personal access tokens (PATs), service role keys, webhook secrets, database passwords, or auth tokens anywhere in the codebase.
   - ❌ **Forbidden:**
     ```typescript
     const GROQ_API_KEY = 'gsk_1234567890abcdef...';
     const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
     ```
   - ✅ **Required:**
     ```typescript
     // In Edge Functions:
     import { getSecret } from './secrets.ts';
     const apiKey = getSecret('GROQ_API_KEY');

     // In Web Frontend (only public keys with VITE_ prefix):
     const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
     ```
2. **Never Commit `.env` Files:**
   - Commit only `.env.example` templates with redacted/dummy placeholders.
   - Always verify `.gitignore` includes `.env`, `.env.local`, `.env.*.local`, and `.scout-tmp/`.
3. **Frontend Secret Leakage:**
   - The web app runs client-side in the browser. **NEVER** expose backend secrets (like `SUPABASE_SERVICE_ROLE_KEY` or `GITHUB_TOKEN`) to `apps/web`.
   - Any secret that begins without `VITE_` will not be bundled, and sensitive operations must happen exclusively inside Supabase Edge Functions.
4. **GitGuardian & CI Scans:**
   - Every commit and pull request is scanned by automated security scanners (GitGuardian). Commits containing secret patterns will be rejected immediately.

---

## 2. 🛡️ Database & API Contract Standards

### Supabase Migrations (`supabase/migrations/`)

1. **Never Mutate Historical Migrations:** Once a migration file is pushed, do not edit it. Always add a new timestamped migration: `YYYYMMDDHHMMSS_description.sql`.
2. **Defensive Schema Changes:**
   - Always use `IF NOT EXISTS` / `IF EXISTS` checks.
   - Set safe defaults on new columns (`DEFAULT 'MANUAL'`).
   - If introducing an `ENUM` type, ensure all consumers (Edge Functions and frontend) map existing values properly before locking the schema.
3. **Row Level Security (RLS):**
   - Every table must have RLS enabled: `ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;`.
   - Never write broad open policies. Restrict reads/writes to `auth.uid() = user_id`.

### API & Edge Functions (`supabase/functions/`)

1. **Backward Compatibility:**
   - Never break frontend contracts without a migration path. If a property is renamed, keep the legacy property supported as a fallback.
2. **CORS & Error Handling:**
   - All Edge Functions must handle preflight `OPTIONS` requests using `_shared/cors.ts`.
   - Return clean JSON error responses (`{ error: string }`) with appropriate HTTP status codes (400, 401, 403, 429, 500).

---

## 3. 💻 TypeScript & Frontend Standards (`apps/web/`)

### TypeScript Typing:

1. **No `any` Escapes:** Avoid `any` whenever possible. Use strict interfaces or generics.
2. **Centralized Types:** Core data contracts must reside in `src/types.ts` or `_shared/types.ts`. Do not define duplicate or conflicting types across pages.

### React Components & State:

1. **Component Modularity:**
   - Keep components focused and under ~300 lines. Break heavy logic into custom hooks (e.g. `useIssueDiscovery`).
2. **Optimistic Updates & Race Conditions:**
   - When using optimistic UI, always maintain request/version locks (`pipelineVersionRef`) to prevent stale background fetches from overriding the UI.
3. **Graceful Fallbacks:**
   - Always handle `loading`, `empty`, and `error` states gracefully with user-friendly messages and icons. Never leave a blank screen or unhandled promise rejection.

### Styling & Design System:

1. **Tailwind CSS Only:** Do not write custom inline CSS or separate CSS files unless strictly necessary for animations.
2. **Responsive Design:** Every page and dialog must work seamlessly on mobile (`sm:`), tablet (`md:`), and desktop (`lg:`).
3. **Accessibility (a11y):**
   - Interactive buttons and icons must include accessible labels (`aria-label` or visible text).
   - Maintain color contrast ratios compliant with WCAG guidelines.

---

## 4. 🧪 Testing & Verification Protocol

### Proof-of-Fix Protocol:

1. **Bug Fixes:**
   - Always write or update a test demonstrating the bug and verifying the fix.
   - Do not claim a fix is complete without running `npm test`.
2. **Zero Regressions:**
   - Run the test suite before submitting:
     ```bash
     npm --prefix apps/web test
     ```
   - Verify the production build compiles with zero TypeScript errors:
     ```bash
     npm --prefix apps/web run build
     ```
3. **No Cheating Tests:**
   - Never comment out, delete, or skip existing tests to make a PR pass. If an existing test fails, either fix the regression or update the test if the specification changed intentionally.

---

## 5. 📦 Git & Pull Request Discipline

1. **Branch Naming:**
   - `feat/feature-name` for new capabilities.
   - `fix/bug-description` for bug fixes.
   - `docs/topic-name` for documentation updates.
2. **Atomic Commits:**
   - Write clear, conventional commit messages: `feat(web): ...`, `fix(backend): ...`, `docs: ...`.
3. **Scope Containment (Tamper Guard):**
   - Keep PRs focused. Do not refactor unrelated files or reformat the entire repository in a bug-fix PR.
4. **Code Quality Checks:**
   - Pre-commit hooks run `prettier` and `eslint`. Ensure all files are cleanly formatted before pushing.

---

## 6. Summary Checklist for Pull Requests

Before opening your PR, check off every item:

- [ ] **No Secrets:** Verified `git diff` contains zero API keys, secrets, or local environment configurations.
- [ ] **TypeScript:** Ran `tsc -b` or `npm run build` with zero type errors.
- [ ] **Tests Pass:** All unit and integration tests pass cleanly (`npm test`).
- [ ] **Backward Compatible:** Database migrations and Edge Functions preserve backward compatibility.
- [ ] **Focused Scope:** PR touches only files necessary for the stated issue or feature.
