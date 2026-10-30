# Scout MCP Protocol: Resources, Progress Notifications, & Telemetry Specification

This document details the Model Context Protocol (MCP) Resources, real-time progress token emission, process telemetry, and offline archive bundle capabilities in Scout MCP v2.

---

## 1. MCP Resources URI Scheme

Scout MCP exposes live sessions and contextual project intelligence via read-only MCP Resources under the `scout://` custom URI scheme.

### Resource Templates

| URI Template                     | MIME Type          | Description                                                            |
| :------------------------------- | :----------------- | :--------------------------------------------------------------------- |
| `scout://sessions/{id}/diff`     | `text/x-diff`      | Live uncommitted unified git diff generated from session git worktree. |
| `scout://sessions/{id}/status`   | `application/json` | Real-time session state metadata (status, timestamps, workspace path). |
| `scout://sessions/{id}/evidence` | `application/json` | Recorded commands, telemetry, validation outputs, and timeline events. |
| `scout://skills`                 | `application/json` | Catalog of loaded skills and repository conventions.                   |

### Resource Structure

#### `scout://sessions/{id}/diff`

Returns a unified patch representing all staged, unstaged, and newly created untracked modifications in the active session's worktree:

```diff
--- a/src/index.ts
+++ b/src/index.ts
@@ -10,3 +10,4 @@
+console.log('patched');
```

#### `scout://sessions/{id}/status`

Returns real-time session state:

```json
{
  "session_id": "c1f7b884-2a13-4cb5-8d57-111111111111",
  "status": "ACTIVE",
  "created_at": "2026-10-30T12:00:00.000Z",
  "last_heartbeat_at": "2026-10-30T12:05:00.000Z",
  "starting_commit_hash": "2ede310e",
  "workspace_path": "/path/to/worktree",
  "task_description": "Implement authentication guardrails"
}
```

#### `scout://sessions/{id}/evidence`

Aggregates all execution audit records:

```json
{
  "commands": [
    {
      "command": "npm test",
      "exitCode": 0,
      "timestamp": "2026-10-30T12:02:10.000Z",
      "telemetry": {
        "duration_ms": 320,
        "cpu_user_micros": 210000,
        "cpu_system_micros": 35000,
        "peak_memory_rss_bytes": 62450000
      }
    }
  ],
  "changedFiles": ["src/index.ts"],
  "gitDiff": "...",
  "validationResults": {
    "validation_ran": true,
    "validation_passed": true
  },
  "telemetry": {
    "total_command_duration_ms": 320,
    "peak_rss_bytes": 62450000,
    "last_recorded_at": "2026-10-30T12:02:10.000Z"
  },
  "timeline": [
    {
      "id": "evt-1730290000-abc123",
      "type": "START",
      "timestamp": "2026-10-30T12:00:00.000Z",
      "summary": "Session initialized with task: Implement authentication guardrails"
    }
  ]
}
```

---

## 2. Real-Time Progress Notification Specification

Scout MCP supports streaming progress updates during long-running operations in compliance with the MCP specification for `notifications/progress`.

### Token Resolution Order

Clients may specify progress tokens through:

1. Standard MCP request metadata: `params._meta.progressToken` (string or number).
2. Explicit tool parameter: `params.arguments.progress_token` (string or number).

### Emission Format

Progress notifications are emitted over the MCP transport as JSON-RPC notifications:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/progress",
  "params": {
    "progressToken": "client-token-99",
    "progress": 60,
    "total": 100,
    "message": "Running advisory validation checks"
  }
}
```

### Supported Tools

- `run_command`: Emits progress at execution start (0%) and execution completion (100%).
- `submit_for_review`: Emits progress across 4 distinct phases:
  1. `10%`: Recording submission status.
  2. `30%`: Collecting git diff and changed files.
  3. `60%`: Running advisory validation suite.
  4. `100%`: Review submission completed successfully.

---

## 3. Telemetry & Timeline Event Stream

### Process Telemetry

Every command executed via `run_command` captures real-time performance telemetry:

- `duration_ms`: Wall-clock execution time in milliseconds.
- `cpu_user_micros`: User CPU execution time in microseconds.
- `cpu_system_micros`: System kernel CPU execution time in microseconds.
- `peak_memory_rss_bytes`: Resident set size (RSS) memory consumption in bytes.

Session-level telemetry accumulates total command runtime and tracks high-water peak memory across all child processes.

### Timeline Lifecycle Events

Scout records an immutable audit trail of session lifecycle milestones:

- `START`: Session initialization and worktree provisioning.
- `EDIT`: File modifications and atomic writes.
- `EXEC`: Shell command executions and subprocess terminations.
- `SUBMIT`: Advisory validation runs and pull request submissions.
- `BLOCK`: Unresolvable blocker flags and error state reports.
- `CANCEL`: Forceful process termination and abort events.

---

## 4. Offline Session Archive Bundles (`export_session_bundle`)

The `export_session_bundle` tool packages full session audit trails into a self-contained, offline `.tar.gz` archive (or `.bundle.json` fallback).

### Bundle Contents

```
bundle-<session_id>.tar.gz/
├── manifest.json   # Export timestamp, manifest version, file inventory
├── session.json    # Local state metadata and workspace paths
├── evidence.json   # Telemetry, commands, validation results
├── timeline.json   # Structured chronological event trail
└── patch.diff      # Raw unified git diff
```

### SHA-256 Verification

Every export returns a cryptographic SHA-256 hash of the generated bundle file for non-repudiation and tamper detection.
