# Open Source Scout MCP Server (`open-source-scout-mcp`)

[![npm version](https://img.shields.io/badge/version-2.2.0-blue.svg)](package.json)
[![tests](https://img.shields.io/badge/tests-382%20passed-brightgreen.svg)](src/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)

The **Scout Model Context Protocol (MCP)** server orchestrates autonomous coding agents inside isolated Git worktrees with guaranteed containment, multi-language validation, dynamic TF-IDF skills discovery, real-time MCP resources, and production CLI tooling.

---

## ⚡ Quick Start

### 1. Environment Verification

```bash
npx open-source-scout-mcp doctor
```

### 2. Client Setup

Configure your AI client (Cursor, Claude Desktop, Cline, Windsurf) by referring to the [Client Setup Guide](./docs/CLIENT_SETUP_GUIDE.md).

For Claude Desktop (`claude_desktop_config.json`):

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

## 🛠️ Tool Catalog

Scout MCP exposes 12 specialized MCP tools:

1. `initialize_execution`: Bootstraps session, creates isolated worktree on a dedicated branch.
2. `read_file`: Reads files with chunked UTF-8 boundary safety.
3. `write_file`: Writes files securely within worktree confines.
4. `edit_file`: Applies deterministic search and replace with multi-hunk atomic rollback.
5. `run_command`: Executes commands with cross-platform shell resolution, timeout, and memory capping.
6. `submit_for_review`: Runs advisory multi-language test pipelines and creates review artifacts.
7. `cancel_session`: Aborts in-flight execution and rolls back uncommitted changes.
8. `cleanup_session`: Destroys worktree and unregisters session state.
9. `mark_blocked`: Flags blockers with structured instructions.
10. `session_heartbeat`: Refreshes session timestamps to avoid stale reaping.
11. `get_session_info`: Inspects active diffs, status, and telemetry.
12. `list_worktrees`: Lists active Scout worktrees.

---

## 📖 Documentation

- [Client Setup Guide](./docs/CLIENT_SETUP_GUIDE.md): Configuration for Cursor, Claude Desktop, Cline, and Windsurf.
- [Architectural Specification](./docs/ARCHITECTURAL_SPECIFICATION.md): State machine, threat model, and concurrency architecture.
- [Resources & Telemetry](./docs/RESOURCES_AND_TELEMETRY.md): Real-time MCP resources (`scout://...`) and progress tokens.
- [Validation Specification](./docs/VALIDATION.md): Multi-language test detection and runner pipeline.
- [Skills & Prompts Specification](./docs/SKILLS_AND_PROMPTS.md): TF-IDF dynamic workspace skills and frontmatter.
- [Changelog](./CHANGELOG.md): Comprehensive 128-PR release history.
