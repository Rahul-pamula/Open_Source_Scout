# Crash Recovery

AI agents crash. Terminals close. IDEs restart. Scout v2 is built to handle this gracefully.

## Stale Session Detection

Scout maintains a persistent local state file (`.scout-tmp/state.json`). Every active session sends a heartbeat. If Scout stops receiving heartbeats for more than a few minutes, the session is marked as `STALE`.

## Resuming with Context

When the AI agent reconnects and asks Scout for a new execution session, Scout checks for stale sessions. If it finds one, it:

1. Navigates into the stale session's hidden git worktree.
2. Runs `git diff HEAD`.
3. Packages the exact uncommitted code changes and returns them in the startup payload.

This allows the AI agent to instantly resume exactly where it left off, reading its previous uncommitted work as if no crash ever occurred!
