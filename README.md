# Open Source Scout

> **Scout is a dual-engine architecture for the AI era.** Use the **v1 Cloud Dashboard** to manage your GitHub contributions, and the **v2 Local MCP** to safely orchestrate AI agents directly in your IDE.

![Scout Preview](./docs/preview.jpg)

## Try it Now — No Installation Required

The Scout v1 Cloud Dashboard is publicly hosted and ready to use:

🔗 **[https://rahul-pamula.github.io/Open_Source_Scout/](https://rahul-pamula.github.io/Open_Source_Scout/)**

Just bring your own Supabase backend and GitHub token. Setup takes about 5 minutes.

> 📢 **New in v2.1.0:** 100-Point Mathematical Relevance Scoring Engine, Push-Down Query Taxonomy, and Structured Interview Defense Generator. Read the [v2.1.0 Release Notes](./docs/RELEASE_NOTES_v2.1.0.md).

---

## The Dual-Engine Architecture

Scout is built for modern developers who use AI. It consists of two completely independent engines:

### ☁️ Part 1: The v1 Cloud Dashboard (For Humans)

A Bring-Your-Own-Backend (BYOB) platform that connects to your personal Supabase instance.

- **Issue Scanner:** Discovers open-source issues on GitHub that match your developer profile.
- **AI Evaluator:** Evaluates each issue with AI to tell you the difficulty and skill match.
- **Mission Control Pipeline:** Tracks your contributions through a visual Kanban pipeline (Discovered -> Claimed -> Assigned -> Review -> Merged).
- **Interview Prep Memory:** Directly attach and manage your personal Google Docs technical notes for every merged contribution, ensuring zero human context decay before technical interviews.

### 🤖 Part 2: The v2 Local MCP Engine (For AI Agents)

A 100% offline local execution harness that your AI assistant (Cursor, Cline, Claude) connects to via the Model Context Protocol (MCP).

- **Git Worktree Isolation:** Isolates all AI code execution inside hidden `git worktrees` so your main branch is never corrupted.
- **CommandBoundaryGuard:** Enforces strict command boundaries so AI cannot escape your project directory (`cd ../..` is blocked).
- **Crash Recovery:** Recovers stale sessions by feeding the AI its own uncommitted diffs if the IDE crashes.

---

## ⚡ How Scout Handles Scale: The 4-Stage Funnel Architecture

GitHub hosts tens of millions of issues, enforces strict Search API limits (30 requests/min), and contains significant noise.

> _"Instead of naively crawling millions of GitHub issues, our system uses a funnel architecture with Push-Down Filtering. We push query constraints directly to GitHub's search index to cut millions down to hundreds, pass those through a zero-latency deterministic edge filter, deduplicate against our local pipeline state, and only run expensive AI evaluations on claimed candidates."_

```mermaid
flowchart TD
    A["GitHub Universe (100M+ Issues)"] -->|1. Push-Down Query Filtering| B["~50 Fresh Candidates"]
    B -->|2. Deterministic Edge Filter| C["Eligible Unassigned Issues"]
    C -->|3. Local Pipeline Deduplication| D["10 High-Signal Scouted Issues"]
    D -->|4. Lazy On-Demand Evaluation| E["Autonomous AI Execution (Scout MCP)"]
```

### How the Funnel Works:

1. **Push-Down Filtering (Upstream Index Querying)**
   Rather than downloading huge feeds, Scout constructs scoped search queries (e.g., `is:open is:issue label:"good first issue" language:typescript sort:updated-desc`) directly against GitHub's search engine. GitHub's inverted indexes do the heavy lifting, instantly narrowing down 100M+ issues to a compact pool of ~50 candidates.
2. **Deterministic Edge Filtering (Zero-Latency Rule Engine)**
   The candidate batch passes through our Deno Edge Function's `FilterEngine`, instantly discarding low-signal issues without calling an LLM:
   - Rejects issues that already have assignees (`isAssigned`).
   - Drops blacklisted tags (`wontfix`, `duplicate`, `invalid`, `spam`, `stale`, `question`).
   - Rejects low-effort submissions (bodies `< 20` characters).
3. **State Deduplication (O(1) Pipeline Filtering)**
   Candidates are cross-referenced with your Supabase pipeline via an `O(1)` Set lookup. Issues already claimed, assigned, merged, or dropped are filtered out so you only see fresh opportunities.
4. **Lazy AI Evaluation (Token Cost Optimization)**
   Expensive LLM reasoning and MCP agent orchestration are never run across raw discovery feeds—they are triggered lazily, only when an issue is claimed for autonomous execution.

---

## 🚀 Getting Started

### Setting up the v1 Cloud Dashboard

Since Scout v1 is a BYOB architecture, you host the backend yourself on Supabase (free tier is perfect).

```bash
# Run the interactive setup CLI
npx open-source-scout setup
```

The CLI will automatically apply PostgreSQL migrations and deploy the Deno Edge Functions to your Supabase project. Then, just visit the [hosted dashboard](https://rahul-pamula.github.io/Open_Source_Scout/) and log in with your keys.

### Setting up the v2 Local MCP Engine

Add this JSON snippet to your AI assistant's MCP configuration file (Cursor, Cline, Claude Desktop):

```json
{
  "mcpServers": {
    "scout": {
      "command": "npx",
      "args": ["-y", "open-source-scout-mcp"]
    }
  }
}
```

---

## 📚 Documentation

For a deep dive into the architecture, security guardrails, and deployment guides, check out the [Official Documentation](https://rahul-pamula.github.io/Open_Source_Scout/#/docs/01_getting_started/01_welcome).

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
