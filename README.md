# Open Source Scout 🎯

Find the issues worth solving. Understand them faster. Contribute with confidence.

**[Try the Hosted App](https://rahul-pamula.github.io/Open_Source_Scout/)**  
_(You do not need to deploy the frontend yourself to use Scout)_

## What is Scout?

Open Source Scout is an AI-assisted workflow that helps you discover, understand, claim, and manage open-source contributions. Instead of aimlessly browsing GitHub for issues you can solve, you configure your intent, and Scout's Mission Control pipeline helps you evaluate and engage with the right opportunities.

---

## 🚀 Current Capabilities (v0.1.0)

Scout currently operates as a **Bring-Your-Own-Backend (BYOB)** application.
Every deployment of Open Source Scout is **100% decentralized**. There is no central Scout server storing everyone's data. **Each developer uses their own Supabase project.**

### Features Available Now

1. **Discovery:** Filters GitHub to find issues matching your exact skills.
2. **AI Dossier:** Groq LLMs analyze issue context, estimate difficulty, and assign a match score.
3. **Claim & Assignment:** Generate context-aware draft comments to request assignment.
4. **Contribution Tracking:** Manage PRs, assignments, and reviews in a tabbed pipeline.
5. **Strict State Guards:** PostgreSQL-level defense-in-depth ensures valid issue state transitions.

### Required Services

- **Supabase**: To host your database, Edge Functions, and manage authentication.
- **GitHub**: To fetch issues, post claim comments, and authenticate you.
- **Groq**: To power the AI evaluation and generate context-aware draft comments.

### How to use v0.1.0

1. Go to the **[Hosted Scout App](https://rahul-pamula.github.io/Open_Source_Scout/)** and click "Sign Up (New Setup)".
2. Gather your Supabase, Groq, and GitHub keys.
3. Run the setup wizard in your terminal: `npx open-source-scout setup`
4. Return to the hosted app, enter your Supabase Connection URL, and sign in!

---

## 🏗 Planned Architecture (Scout 2.0)

We are pivoting Scout from a simple issue tracker into a platform-agnostic **Agentic Context Engine**.

### The Hybrid Architecture Pivot

Scout 2.0 will use a strictly separated architecture:

1. **Supabase / PostgreSQL (Authority & Security):** Handles authentication, state, and rate limiting (Already in v0.1.0).
2. **GitHub CI (Code Quality Enforcement):** The only layer that mechanically enforces test passage via branch protection.
3. **Scout MCP (Orchestration):** A future Model Context Protocol server that connects your local IDE AI to Scout's state. It will deliver context, load `.scout/skills/`, and provide local _advisory_ validation (git diff/npm test). It will NOT be an enforcement boundary.
4. **Skills (`.scout/skills/`):** Declarative markdown workflows providing context and helper guides to the AI.

_Note: The MCP Server and Skills features are currently under development in Phase 2 and are not yet available._

---

## 🛠 Developing Scout

_Only follow these instructions if you want to modify Scout's source code and contribute to the project itself._

Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting a Pull Request. We use a **risk-based PR workflow** where high-risk changes (DB, MCP, Auth) require strict review, while low-risk changes (Docs) use a lightweight path.

### Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Rahul-pamula/Open_Source_Scout.git
   cd Open_Source_Scout
   ```
2. **Install dependencies:**
   ```bash
   npm install --workspace=apps/web
   npm install --workspace=packages/cli
   ```
3. **Run the frontend:**
   ```bash
   npm run dev --workspace=apps/web
   ```
   The app will run at `http://localhost:5173`.

### Security Vulnerabilities

If you discover a security vulnerability, please refer to our [Security Policy](SECURITY.md) for reporting instructions.

### License

This project is licensed under the [MIT License](LICENSE).
