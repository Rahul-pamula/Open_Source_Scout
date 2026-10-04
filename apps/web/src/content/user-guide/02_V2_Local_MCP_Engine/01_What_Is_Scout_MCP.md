# What is Scout MCP?

Scout MCP is a **100% offline, local execution harness** that allows AI agents to safely interact with your codebase.

## The Problem with AI Agents

Modern AI agents (like Cursor, Cline, or Claude) are incredibly powerful, but giving them raw, unrestricted shell access to your machine is dangerous:

- They can accidentally delete files outside the project scope.
- They can corrupt your main git branch with half-baked code.
- They can get stuck in infinite loops running a server.

## The Scout Solution

Scout acts as a protective proxy between the AI agent and your machine using the Model Context Protocol (MCP).

When an AI agent wants to execute a command or modify code, it must ask Scout. Scout then:

1. Provisions a hidden `git worktree` so the main branch is untouched.
2. Applies strict sandboxing (blocking `cd ../..`).
3. Enforces timeouts (10 minutes max per command).

> [!NOTE]
> Scout v2 is completely decoupled from the v1 Cloud Dashboard. It requires zero cloud infrastructure, no Supabase, and no API keys. It runs entirely on your local machine.
