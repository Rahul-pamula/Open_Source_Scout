# Security & Guardrails

Scout implements multiple layers of defense to prevent AI agents from going rogue.

## CommandBoundaryGuard

The `CommandBoundaryGuard` intercepts all raw terminal commands before they are executed. It aggressively blocks any command that attempts to escape the isolated directory.

```typescript
// Blocked patterns
cd ../..
cd /etc/
rm -rf /
```

Instead of using Node's dangerous `shell: true`, Scout wraps execution in a strict `sh -c` wrapper, ensuring the working directory is absolutely locked to the hidden worktree.

## Process Timeouts (treeKill)

AI agents frequently start servers (`npm run dev`) and forget to stop them, creating zombie processes. Scout enforces a strict 10-minute maximum timeout on all commands. It uses cross-platform process tree killing to ensure the parent command and all its spawned children are completely annihilated.
