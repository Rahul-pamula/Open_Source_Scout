# Scout MCP Client Configuration Guide

This guide provides step-by-step instructions to configure **Scout MCP** (`open-source-scout-mcp`) across popular Model Context Protocol (MCP) clients, including **Claude Desktop**, **Cursor**, **Cline**, and **Windsurf**.

---

## 1. Prerequisites

Before configuring your client, verify your environment with `scout-mcp doctor`:

```bash
# Verify installation and prerequisites
npx open-source-scout-mcp doctor
```

Prerequisites:

- **Node.js**: `v18.0.0` or higher (recommended: Node 20 LTS or 22).
- **Git**: `v2.20.0` or higher (required for git worktree isolation).
- **GitHub Token** _(optional)_: A GitHub personal access token (`GITHUB_TOKEN`) with `repo` or public repository read access if interacting with remote repositories.

---

## 2. Claude Desktop

Claude Desktop connects to local MCP servers via standard I/O (`stdio`).

### Configuration File Locations

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Configuration Snippet

Add `open-source-scout` under the `mcpServers` object:

```json
{
  "mcpServers": {
    "open-source-scout": {
      "command": "npx",
      "args": ["-y", "open-source-scout-mcp"],
      "env": {
        "GITHUB_TOKEN": "ghp_yourPersonalAccessTokenHere"
      }
    }
  }
}
```

#### Using Local Source or Development Build

If running directly from a cloned repository:

```json
{
  "mcpServers": {
    "open-source-scout": {
      "command": "node",
      "args": ["/absolute/path/to/Open_Source_Scout/packages/scout-mcp/dist/index.js"],
      "env": {
        "DEBUG": "scout:*"
      }
    }
  }
}
```

Restart Claude Desktop after updating the configuration. Click the hammer icon in the prompt input to verify that Scout MCP tools (e.g., `initialize_execution`, `read_file`, `run_command`, `submit_for_review`) are registered.

---

## 3. Cursor IDE

Cursor supports MCP servers directly in its workspace or global configurations.

### Configuration File Location

Create or edit `.cursor/mcp.json` in your workspace root, or navigate to **Cursor Settings > Features > MCP**:

```json
{
  "mcpServers": {
    "scout": {
      "command": "npx",
      "args": ["-y", "open-source-scout-mcp"],
      "env": {
        "GITHUB_TOKEN": "${env:GITHUB_TOKEN}"
      }
    }
  }
}
```

### Verification in Cursor

1. Open Cursor Settings (`Cmd + ,` or `Ctrl + ,`).
2. Navigate to **Features > MCP**.
3. Confirm that the `scout` server is green and shows all Scout MCP tools.

---

## 4. Cline (VS Code Extension)

Cline allows dynamic MCP server integration via VS Code extension settings.

### Configuration File Location

- **macOS**: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- **Windows**: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
- **Linux**: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

### Configuration Snippet

```json
{
  "mcpServers": {
    "scout-mcp": {
      "command": "npx",
      "args": ["-y", "open-source-scout-mcp"],
      "env": {
        "GITHUB_TOKEN": "ghp_yourToken"
      },
      "disabled": false,
      "autoApprove": ["ping", "read_file", "get_session_info", "list_worktrees"]
    }
  }
}
```

> **Tip:** You can add safe read-only tools to `autoApprove` so Cline can inspect files and status without requiring manual approval clicks.

---

## 5. Windsurf (Codeium)

Windsurf supports Model Context Protocol servers configured through its global MCP configuration.

### Configuration File Location

- **macOS / Linux**: `~/.codeium/windsurf/mcp_config.json`
- **Windows**: `%USERPROFILE%\.codeium\windsurf\mcp_config.json`

### Configuration Snippet

```json
{
  "mcpServers": {
    "scout": {
      "command": "npx",
      "args": ["-y", "open-source-scout-mcp"],
      "env": {
        "GITHUB_TOKEN": "ghp_yourTokenHere"
      }
    }
  }
}
```

---

## 6. Environment Variables

| Variable                 | Description                                                       | Default            |
| ------------------------ | ----------------------------------------------------------------- | ------------------ |
| `GITHUB_TOKEN`           | Personal access token for GitHub API interactions                 | None               |
| `SCOUT_MAX_EXEC_TIME_MS` | Default timeout for command execution harness                     | `300000` (5 mins)  |
| `SCOUT_ALLOWED_DIR`      | Optional root directory to enforce workspace boundary confinement | Cwd / session root |
| `SCOUT_MAX_WORKTREES`    | Maximum concurrent active worktrees permitted                     | `10`               |
| `DEBUG`                  | Enable verbose debug logging (`scout:*` or `scout:harness`)       | Inactive           |

---

## 7. Diagnostics & Troubleshooting

### Common Diagnostics

Run the built-in diagnostic tool to test your environment:

```bash
npx open-source-scout-mcp doctor
```

### Common Issues and Resolutions

1. **`git worktree` command failed:**
   - Verify that your repository is not a shallow clone (`git rev-parse --is-shallow-repository`). If shallow, run `git fetch --unshallow`.
   - Ensure Git is version `>= 2.20.0`.

2. **Process exit code 127 / command not found:**
   - When running via Claude Desktop on macOS, PATH may differ from your shell. Use absolute paths to Node (e.g. `/usr/local/bin/node` or `/opt/homebrew/bin/node`).

3. **Rate limiting on remote repo inspection:**
   - Supply a valid `GITHUB_TOKEN` in the client's `env` configuration block.

4. **Resource scheme access (`scout://sessions/...`):**
   - Ensure your MCP client supports MCP Resource subscriptions or Resource template reads. If unsupported by the client UI, use `get_session_info` tool directly.
