# Universal Configuration

Setting up Scout v2 is incredibly simple because it uses the open Model Context Protocol (MCP) standard.

## The JSON Snippet

Add this configuration to your favorite AI assistant's MCP configuration file:

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

### Setup for Cursor

1. Open Cursor Settings.
2. Go to **Features > MCP Servers**.
3. Click **+ Add New MCP Server**.
4. Set Name to `scout`, Type to `command`, and Command to `npx -y open-source-scout-mcp`.

### Setup for Cline

1. Open your Cline settings directory.
2. Open or create the `cline_mcp.json` file.
3. Paste the universal JSON snippet into the file.

### Setup for Antigravity

1. Open `~/.gemini/config/mcp_config.json`.
2. Merge the universal JSON snippet into the file.
