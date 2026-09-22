# Contributing to Open Source Scout

Thank you for your interest in contributing to Open Source Scout!

Please review our [Code of Conduct](CODE_OF_CONDUCT.md) before participating in the community.

## Project Structure

This repository uses a custom structure containing a web app and a CLI tool. Note that there is **no root `package.json`**.

- `apps/web`: The Vite/React frontend application.
- `packages/cli`: The Node.js command-line setup wizard.
- `supabase`: The database schema, edge functions, and configuration.
- `.scout/skills/`: Markdown files that provide context to the Scout AI (planned for 2.0).

---

## 🚦 Risk-Based Pull Request Workflow

We use a risk-based PR workflow to ensure security without slowing down simple contributions. As the repository maintainer, I explicitly retain the permission to merge PRs.

### Low-Risk PRs

**Examples**: README changes, documentation, typos, Code of Conduct updates, issue templates.

- **Workflow**: These changes use a lightweight review path. Please open a PR and wait for a maintainer review. If CI passes and the change is small, it will be merged quickly.

### High-Risk PRs

**Examples**: Database migrations, RLS, Auth, Supabase Edge Functions, MCP, `.scout/skills/`, GitHub CI workflows, `CODEOWNERS`, version bumps, security features.

- **Workflow**: These changes require strict validation.
  - **CI Success**: Your PR must pass all CI checks (lint, build, tests, security audit).
  - **CODEOWNERS Review**: Changes to protected paths (like `.github/` and `.scout/`) require explicit review.
  - **Maintainer Approval**: A maintainer must approve the PR before it can be merged.

---

## Development Setup

### 1. Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Docker](https://www.docker.com/) (For local Supabase testing)

### 2. Install Dependencies

You must install dependencies in the respective directories:

```bash
# Frontend
cd apps/web
npm install

# CLI
cd ../../packages/cli
npm install
```

### 3. Local Development

```bash
# Start the frontend development server
cd apps/web
npm run dev
```

## Testing & Quality

Before submitting a Pull Request, please ensure all automated checks pass locally. Our CI pipeline enforces these strictly on high-risk PRs.

### Linting & Building

```bash
cd apps/web
npm run lint
npm run build
```

### CLI Tests

```bash
cd packages/cli
node --test test/setup.test.js
```

### Database & RLS Tests

```bash
supabase start
supabase test db
```

### Security Audit

We run a custom security scanner to ensure credentials aren't accidentally exposed.

```bash
# From the repository root
node scripts/security-audit.js
```

## Submitting a Pull Request

1. Branch off `main`.
2. Commit your changes with descriptive messages.
3. Open a Pull Request on GitHub. Use the PR template and clearly identify your **Risk Level**.
4. The CI pipeline will automatically run linting, tests, and security audits.
5. A maintainer will review your code based on the risk-based workflow.
