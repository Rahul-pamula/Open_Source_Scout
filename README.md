# 🚀 Open Source Scout — The 10x Developer OS for the AI Era

[![Frontend](https://img.shields.io/badge/Frontend-React_19_%2B_Vite_8-20232A?style=flat&logo=react&logoColor=61DAFB)](https://react.dev)
[![Backend](<https://img.shields.io/badge/Backend-Supabase_(PostgreSQL)-10B981?style=flat&logo=supabase&logoColor=white>)](https://supabase.com)
[![Local MCP](https://img.shields.io/badge/Local_MCP-Scout_MCP_v2.2.0-8B5CF6?style=flat&logo=anthropic&logoColor=white)](https://modelcontextprotocol.io)
[![Edge Runtime](https://img.shields.io/badge/Edge_Runtime-Deno_v2-20232A?style=flat&logo=deno&logoColor=white)](https://deno.land)
[![Security](https://img.shields.io/badge/Security-AES--256--GCM_Client_Vault-059669?style=flat&logo=shield&logoColor=white)](https://github.com/Rahul-pamula/Open_Source_Scout)
[![Styling](https://img.shields.io/badge/Styling-Tailwind_CSS_v4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Language](https://img.shields.io/badge/Language-TypeScript_5.8-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

> **Scout is the 10x Developer OS for the AI era.** Use the **v1 Cloud Dashboard** to manage your GitHub contributions, and the **v2 Local MCP** to safely orchestrate AI agents directly in your IDE.

![Scout Preview](./docs/preview.png)

## Try it Now — No Installation Required

The Scout v1 Cloud Dashboard is publicly hosted and ready to use:

🔗 **[https://rahul-pamula.github.io/Open_Source_Scout/](https://rahul-pamula.github.io/Open_Source_Scout/)**

Just bring your own Supabase backend and GitHub token. Setup takes about 5 minutes.

> 🚀 **New in v2.2.0:** Scout MCP Server 128-PR Enterprise Overhaul! Complete with Git worktree concurrency, universal multi-language test validation, TF-IDF dynamic skills, real-time MCP resources, and cross-platform CLI diagnostics. Read the [v2.2.0 Release Notes](./docs/RELEASE_NOTES_v2.2.0.md), [MCP Architectural Specification](./docs/mcp/SPECIFICATION.md), and [Client Setup Guide (Cursor, Claude, Cline, Windsurf)](./packages/scout-mcp/docs/CLIENT_SETUP_GUIDE.md).

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

A production-grade, 100% offline local execution harness that connects your AI assistant (Cursor, Claude Desktop, Cline, Windsurf) via the Model Context Protocol (MCP):

- **Git Worktree Isolation:** Isolates all AI code execution inside hidden `git worktrees` on dedicated branches so your main branch is never corrupted.
- **Sandboxed Execution Harness:** Subprocess tracking via `tree-kill`, configurable timeouts, path traversal defense, and sensitive token redaction.
- **Universal Multi-Language Validation:** Auto-detects and runs test suites across Node (npm, pnpm, yarn, bun), Deno, Python, Rust, Go, Java/Kotlin, .NET, and Make.
- **Dynamic TF-IDF Skills Discovery:** Auto-discovers and injects workspace context and style rules into agent prompts based on task descriptions.
- **Real-Time MCP Resources & Telemetry:** Exposes live diffs, status updates, timeline events, progress notifications, and hardware telemetry profiling (`peak_rss_bytes`).
- **Comprehensive CLI Tooling:** Includes `scout-mcp doctor` diagnostics and instant integration with Cursor, Claude, Cline, and Windsurf.

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

## Workspaces & App Launcher Architecture

Open Source Scout includes an integrated **Workspaces OS** designed for developers and interns to organize external tools, documentation, repositories, and credentials.

- **1-Click App Launcher:** High-density mobile-style squircle launcher.
- **Zero-Knowledge Vault:** Client-side AES-256-GCM encryption for passwords.
- **Daily Standup Generator:** Format tasks and links directly for Slack and Teams.

### 10x Developer & AI Pipeline

```mermaid
graph LR
    A[Uncontested Issues] --> B[Scout AI Discovery]
    B --> C[Worktree Sandbox]
    C --> D[Multi-Language Test Validation]
    D --> E[Merged PR & Standup Report]
```
