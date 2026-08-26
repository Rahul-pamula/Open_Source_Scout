# Contributing to Open Source Scout

Thank you for your interest in contributing to Open Source Scout!

## Project Structure
This repository uses a custom structure containing a web app and a CLI tool. Note that there is **no root `package.json`**.
- `apps/web`: The Vite/React frontend application.
- `packages/cli`: The Node.js command-line setup wizard.
- `supabase`: The database schema, edge functions, and configuration.

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

Before submitting a Pull Request, please ensure all automated checks pass locally. Our CI pipeline enforces these strictly.

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
3. Open a Pull Request on GitHub.
4. The CI pipeline will automatically run linting, tests, and security audits.
5. A maintainer will review your code.
