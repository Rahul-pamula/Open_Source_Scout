# Core Concepts

Before diving in, let's define the core concepts that power Scout's dual-engine architecture.

## Model Context Protocol (MCP)

MCP is an open standard that allows AI agents to securely interact with local tools. Scout v2 is built entirely on MCP, acting as a secure bridge between your AI assistant and your filesystem.

## Git Worktrees

Instead of letting AI agents modify your main repository (and potentially ruin your uncommitted work), Scout executes all AI commands inside hidden `git worktrees` (e.g., `.scout-tmp/worktrees/`). If an agent breaks something, your main branch is perfectly safe.

## BYOB Architecture

Bring-Your-Own-Backend. Scout v1 does not host your data. You deploy the database, edge functions, and API keys to your own Supabase instance. You own your data.

## The Radar & The Dossier

- **The Radar:** The v1 discovery engine that actively scans GitHub for issues matching your developer profile.
- **The Dossier:** The v1 AI evaluation engine that reads the issue and tells you exactly how hard it is and if you have the right skills to solve it.
