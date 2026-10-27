# Scout MCP Git Worktree Architecture & Lifecycle Guide

## 1. Overview & Architecture

Scout MCP executes AI coding operations inside dedicated, isolated Git worktrees rather than modifying the user's primary working tree directly. This ensures:

- **Zero Interruption:** The developer's primary working directory and active git staging index remain untouched.
- **Isolated Branching:** Every AI task runs in its own task branch (`scout/<shortId>-<slug>`).
- **Rapid Cleanup:** Discarding or completing a session requires removing only the associated worktree directory and branch.

### Directory Structure

```
<repo-root>/
├── .git/
│   └── worktrees/
│       └── <session-id>/
├── .scout-tmp/
│   ├── sessions/
│   │   └── <session-id>/
│   │       ├── state.json
│   │       └── evidence.json
│   └── worktrees/
│       └── <session-id>/     <-- Isolated worktree checkout
```

---

## 2. Worktree Allocation & Lifecycle

### A. Creation & Submodule Handling

When a session is initialized (`initialize_execution`), Scout MCP:

1. Verifies the repository root via `git rev-parse --show-toplevel`.
2. Generates a deterministic branch name via `generateWorktreeBranchName(sessionId, taskDescription)`.
   - Pattern: `scout/<shortSessionId>-<slug>` (sanitized, lowercase alphanumeric slug capped to 30 chars).
   - Fallback: `scout-session-<sessionId>`.
3. Invokes `execWithGitLockRetry` to run `git worktree add -b <branch> <path>`.
4. Checks if `.gitmodules` exists in the newly allocated worktree; if present, runs `git submodule update --init --recursive`.

### B. Creation Rollback on Failure

If any step during worktree allocation fails (e.g. disk full, permission issue, corrupted ref):

- `rollbackWorktreeCreation(sessionId, cwd, taskDescription)` is immediately triggered.
- Partially created directories in `.scout-tmp/worktrees/<session-id>` are force-removed.
- The allocated branch (`scout/...`) is deleted via `git branch -D`.
- Git's internal worktree references are cleaned up via `git worktree prune`.
- An actionable error is thrown without leaving orphaned state.

---

## 3. Concurrency & Git Index Locking

### Retry Mechanism (`execWithGitLockRetry`)

Git operations modifying index or refs create transient lock files (`.git/index.lock` or `.git/worktrees/.../locked`). When multiple sessions or local developer operations occur concurrently, operations can hit lock contention.

Scout MCP protects every worktree manipulation using `execWithGitLockRetry`:

- **Default Retries:** 5 attempts.
- **Initial Delay:** 100ms.
- **Backoff & Jitter:** Exponential backoff multiplied by `(1 + random(0, 0.5))` to prevent thundering herd collisions.
- **Lock Detection:** Checks error outputs for `index.lock`, `locked`, and `Unable to create ...lock`.

---

## 4. Auditing & Inspection (`list_worktrees`)

The `list_worktrees` MCP tool and `listWorktrees(cwd)` utility inspect the repository using `git worktree list --porcelain`:

```json
{
  "worktrees": [
    {
      "path": "/workspace/project",
      "head": "a1b2c3d...",
      "branch": "main"
    },
    {
      "path": "/workspace/project/.scout-tmp/worktrees/9f8e7d6c-...",
      "head": "e4f5a6b...",
      "branch": "scout/9f8e7d6c-fix-auth-header",
      "isScoutSession": true,
      "sessionId": "9f8e7d6c-..."
    }
  ],
  "count": 2
}
```

Recognized attributes:

- `path`: Absolute filesystem path to the worktree.
- `head`: Full commit SHA.
- `branch`: Current branch name without `refs/heads/`.
- `isBare`: Whether the worktree is bare.
- `isDetached`: True if HEAD is detached (e.g., checkout of commit/tag).
- `isLocked` & `lockReason`: Lock status if locked via `git worktree lock`.
- `isScoutSession` & `sessionId`: Identifies whether the worktree belongs to a Scout MCP session.

---

## 5. Teardown, Pruning, and Orphan Recovery

### Automatic Pruning on Server Startup

Upon server initialization, `autoPruneWorktreesOnStartup(cwd)` runs:

1. `git worktree prune` to clear administrative records for worktrees whose directories were removed.
2. `cleanupOrphanedWorktrees(cwd)` cross-references active sessions in `.scout-tmp/sessions/` against `.scout-tmp/worktrees/` and orphaned `scout-*` branches, removing any stale worktrees left from terminated processes.

### Session Cancellation & Cleanup

- Calling `cancel_session` or `cleanup_session` forcefully removes the worktree (`git worktree remove --force`), prunes worktree metadata, and deletes the temporary branch.

---

## 6. Disk Quota & Telemetry

Large builds, temporary artifacts, or extensive dependencies (`node_modules`) inside worktrees can consume disk space.

- `checkWorktreeDiskUsage(sessionId, cwd, warningThresholdMb = 500)` recursively calculates worktree directory size.
- If size exceeds 500 MB (configurable), a warning is attached to session telemetry in `get_session_info`.

---

## 7. Untracked Files & Evidence Diffs

To capture accurate diffs for PR submission and review:

- `getGitDiff` executes `git add -N .` (intent-to-add) before diffing against `HEAD`.
- This ensures newly authored files appear in unified diffs (`new file mode 100644`) rather than being omitted as untracked files.
- `.gitignore` rules are strictly respected; ignored binaries and vendor dependencies are excluded from evidence collection.
