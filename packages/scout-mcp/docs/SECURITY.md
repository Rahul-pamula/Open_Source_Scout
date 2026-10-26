# Scout v2 MCP Security Model & Boundary Guard Guide

## Overview

Scout v2 MCP operates directly within development workspaces on behalf of client AI agents. Because the model can issue file mutations, file inspections, and terminal command executions, Scout implements a defense-in-depth security boundary model designed to prevent:

1. System destruction or corruption (destructive root commands, forkbombs, filesystem reformatting).
2. Host breakout and path traversal (escaping worktrees to read or write arbitrary host files).
3. Secret and credential exfiltration (SSH private keys, AWS/cloud tokens, production `.env` files).
4. Git repository and hook tampering (modifying `.git/hooks` to gain persistence or trigger pre-commit exploits).
5. Environment and dynamic linker subversion (`LD_PRELOAD`, `DYLD_INSERT_LIBRARIES`, malicious `NODE_OPTIONS`).

---

## Architecture

The security model is enforced at three distinct layers before any tool payload touches the host system or filesystem:

```
┌────────────────────────────────────────────────────────┐
│               Client AI Request (JSON-RPC)             │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Layer 1: Schema & Parameter Validation (Zod)           │
│   • Reject malformed inputs, missing session IDs       │
│   • Return standard JSON-RPC 2.0 error (-32602)        │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Layer 2: Guardrail Boundary Enforcers                  │
│   • CommandBoundaryGuard (destructive syntax, subshell)│
│   • validatePathBoundary (worktree confinement, symlinks)│
│   • SecretGuard & GitProtection (.git, .env, keys)     │
│   • sanitizeEnvironment (scrubs dangerous env vars)    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Layer 3: Controlled Execution Sandbox                  │
│   • Child process spawned with sanitized env & worktree│
│   • Atomic file I/O operations with lockfile protection │
└────────────────────────────────────────────────────────┘
```

---

## 1. Command Execution Guardrails (`CommandBoundaryGuard`)

The `run_command` MCP tool executes shell commands inside the active session's isolated worktree. Every command is inspected before dispatch.

### Prohibited Command Patterns

- **Destructive Deletion:** Recursive deletion commands targeting root or system directories (e.g., `rm -rf /`, `rm -rf /*`, `rm -rf ~`, `rm -rf $HOME`).
- **Disk & Filesystem Formatting:** Raw block device manipulation (e.g., `mkfs`, `mkfs.ext4`, `dd if=... of=/dev/sd*`, `fdisk`, `parted`).
- **Denial of Service / Forkbombs:** Shell resource exhaustion payloads like `:(){ :|:& };:`.
- **Subshell & Shell Escapes:** Arbitrary command expansion wrappers such as `$()` or backticks (` ` `) intended to bypass pattern matchers.
- **Directory Traversal in Commands:** `cd` or `pushd` statements attempting to traverse outside the worktree via `..`, absolute paths (`/` or `C:\`), or home paths (`~`, `$HOME`).

### Environment Sanitization (`sanitizeEnvironment`)

To prevent arbitrary code execution during binary startup, child processes inherit a strictly scrubbed environment:

- **Dynamic Linker Variables Blocked:** `LD_PRELOAD`, `LD_LIBRARY_PATH`, `DYLD_INSERT_LIBRARIES`, `DYLD_LIBRARY_PATH`.
- **Interpreter Injection Blocked:** `NODE_OPTIONS`, `PYTHONPATH`, `RUBYOPT`, `PERL5OPT`.
- **Sensitive Secrets Stripped:** Any environment variable containing sensitive tokens (AWS, GitHub, GitLab, NPM tokens) unless explicitly white-listed for test execution.

---

## 2. Filesystem Boundary Guardrails (`validatePathBoundary`)

All file manipulation tools (`read_file`, `write_file`, `edit_file`) resolve paths through `validatePathBoundary`.

### Traversal and Host Containment

- **Path Normalization:** Windows backslashes (`\`) are normalized to standard forward slashes (`/`) prior to evaluation to defeat cross-platform path confusion.
- **Drive Letter Escape:** Absolute Windows drive paths (e.g. `C:\Windows`, `D:/`) are blocked.
- **Worktree Prefix Enforced:** The fully resolved canonical path must reside within the session worktree (`absoluteTarget.startsWith(absoluteWorktree + path.sep)`).
- **Symlink Escape Protection:** Intermediate directory symlinks are resolved via `fs.realpathSync`. If a symlink resolves to a location outside the session worktree, the operation is blocked.

### Protected File and Directory Blacklists

1. **System Directories:** Access to `/etc`, `/proc`, `/sys`, `/dev`, `/var/run`, and `/private/etc` is blocked.
2. **Git Repository Metadata:** Any path segment containing `.git` (including `.git/hooks`, `.git/config`, `.git/objects`) is strictly forbidden to prevent repository corruption and persistence via malicious git hooks.
3. **Cloud & CLI Credentials:** Access to credential folders such as `.ssh`, `.aws`, `.azure`, and `.kube` is blocked.
4. **Environment Secrets:** Access to `.env` or any `.env.*` file is blocked, except for harmless templates (`.env.example`, `.env.sample`, `.env.template`).
5. **Private Cryptographic Keys:** Access to SSH private keys (`id_rsa`, `id_ed25519`, `id_ecdsa`) and certificates (`*.pem`, `*.key`, `*.pfx`, `*.p12`) is blocked.

---

## 3. Configurable Guardrail Levels

Scout supports three operational security modes configured via the `SCOUT_GUARDRAIL_LEVEL` environment variable:

| Mode         | Env Value            | Behavior                                                                                                                                                              |
| :----------- | :------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Standard** | `standard` (default) | Enforces all boundary protections and throws `GuardrailError` on any violation.                                                                                       |
| **Strict**   | `strict`             | Same as standard, with zero tolerance for legacy command syntax or fuzzy paths.                                                                                       |
| **Audit**    | `audit`              | Non-blocking telemetry mode. Logs `[Guardrail Audit Warning]` messages to `console.warn` without aborting execution. Used for dry-run analysis and CI policy testing. |

---

## 4. JSON-RPC 2.0 Error Reporting

When a guardrail violation occurs, Scout MCP intercepts the error and returns a spec-compliant JSON-RPC 2.0 response:

```json
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "error": {
    "code": -32003,
    "message": "Guardrail violation: Path boundary violation. Access to /etc/shadow is strictly forbidden.",
    "data": {
      "errorType": "GuardrailViolation",
      "level": "standard"
    }
  }
}
```

This guarantees that calling AI agents receive structured feedback indicating that an action was blocked due to safety policies rather than a generic server failure.
