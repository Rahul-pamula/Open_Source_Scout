# Changelog: Scout MCP Server (`open-source-scout-mcp`)

All notable changes to the Scout MCP Server across the 128-PR overhaul are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.2.0] - 2026-10-30

Scout MCP v2.2.0 represents a comprehensive overhaul of the Model Context Protocol orchestration engine, delivering enterprise-grade Git worktree isolation, multi-language validation, dynamic skills discovery, real-time MCP resources, and production CLI tooling across 128 pull requests.

### Architectural Highlights

- **128 Pull Requests Delivered**: 100% test-backed, squash-merged, cross-platform verified across Linux, macOS, and Windows.
- **Collaborative Co-Authorship**:
  - **PRs 1–64 (Phases 1–4)**: Co-authored by `@Rnithins` (`Rayapureddy Nithin <rayapureddynithin@gmail.com>`).
  - **PRs 65–128 (Phases 5–8)**: Co-authored by `@alphacoder-hash` (`Vaibhav Pandey <aryanpandey392@gmail.com>`).
- **Zero Impact on Scout v1 Web Application**: Strict boundary enforcement confining all changes to `packages/scout-mcp/`, root `.github/workflows/`, and documentation.

---

### Phase 1: Foundation & Session State Persistence (PRs #627–#642)

_Co-authored by Rayapureddy Nithin <rayapureddynithin@gmail.com>_

- **State Persistence**: Persisted session workspace cwd into `.scout-tmp/state.json` (#627).
- **Crash Recovery**: Restored `sessionWorkspaces` map on server reboot (#628).
- **Zod Schema Validation**: Added strict runtime type validation for `state.json` (#629).
- **Unit Testing**: Unit test suite for `state.json` parsing, schema validation, and error recovery (#630).
- **Stale Session Reaper**: Implemented 30-minute inactivity reaper for orphan cleanup (#631).
- **Stale Reaper Tests**: Unit tests for session stale detection, heartbeat refresh, and automatic cleanup (#632).
- **Session Heartbeat**: Added `session_heartbeat` MCP tool to refresh active timestamps (#633).
- **Session Cancellation**: Implemented `cancel_session` MCP tool to abort sessions cleanly (#634).
- **Lifecycle Tests**: Integration tests for `session_heartbeat` and `cancel_session` (#635).
- **Session Querying**: Added `get_session_info` MCP tool returning status, branch, and metadata (#636).
- **Session Query Tests**: Unit test suite for `get_session_info` (#637).
- **Evidence Storage**: Implemented `evidence.json` tracking commands and git diffs (#638).
- **Evidence Unit Tests**: Test suite for `evidence.json` storage and retrieval (#639).
- **Documentation**: Published MCP session state machine lifecycle specifications in `docs/LIFECYCLE.md` (#640).
- **Git Diff Capture**: Added untracked file capture and `.gitignore` awareness in `getGitDiff` (#641).
- **Phase 1 Regression Suite**: Capstone regression tests for session lifecycle and persistence (#642).

---

### Phase 2: Git Worktree Concurrency & Lifecycle (PRs #643–#658)

_Co-authored by Rayapureddy Nithin <rayapureddynithin@gmail.com>_

- **Worktree Concurrency**: Added lock retries with exponential backoff for `.git/index.lock` contention (#643).
- **Concurrency Tests**: Stress test suite verifying 5 concurrent worktree operations (#644).
- **Worktree Listing**: Implemented `list_worktrees` MCP tool (#645).
- **Listing Tests**: Unit tests for `list_worktrees` tool (#646).
- **Branch Sanitization**: Sanitized worktree branch names and slugs (#647).
- **Sanitization Tests**: Unit tests for worktree branch name generation (#648).
- **Worktree Pruning**: Added detached and missing worktree auto-pruning (#649).
- **Pruning Tests**: Unit tests for worktree pruning logic (#650).
- **Dirty Worktree Cleanup**: Implemented force cleaning for dirty worktrees (#651).
- **Dirty Cleanup Tests**: Unit tests for dirty worktree cleanup (#652).
- **Worktree Limit Guardrails**: Enforced `SCOUT_MAX_WORKTREES` cap with LRU eviction (#653).
- **Limit Tests**: Unit tests for maximum worktree capacity and LRU eviction (#654).
- **Documentation**: Published Git worktree architecture documentation in `docs/WORKTREES.md` (#655).
- **Detached HEAD Detection**: Fallback branch generation on detached HEAD repositories (#656).
- **Creation Rollback**: Added atomic rollback on worktree creation failure (#657).
- **Phase 2 Regression Suite**: Capstone regression tests for worktree lifecycle and concurrency (#658).

---

### Phase 3: Sandboxed Execution & Process Safety (PRs #659–#674)

_Co-authored by Rayapureddy Nithin <rayapureddynithin@gmail.com>_

- **Process Tracking**: Tracked active processes and children via `tree-kill` (#659).
- **Process Tracking Tests**: Unit tests for process tree killing and orphan prevention (#660).
- **Command Timeouts**: Enforced `SCOUT_MAX_EXEC_TIME_MS` configurable execution timeouts (#661).
- **Timeout Tests**: Unit tests for execution timeouts (#662).
- **Path Traversal Guards**: Strictly confined file paths to session worktree bounds (#663).
- **Path Guard Tests**: Unit tests for path traversal prevention (#664).
- **Command Guardrails**: Blacklisted destructive commands (`rm -rf /`, `mkfs`, fork bombs) (#665).
- **Command Guard Tests**: Unit tests for blocked command detection (#666).
- **Sensitive Redaction**: Redacted API keys and environment secrets from logs and evidence (#667).
- **Redaction Tests**: Unit tests for credential redaction (#668).
- **Output Truncation**: Capped stdout and stderr buffers at 1MB to prevent OOM (#669).
- **Truncation Tests**: Unit tests for stdout/stderr truncation (#670).
- **Non-Zero Exit Handling**: Structured stderr reporting on command failure (#671).
- **Exit Code Tests**: Unit tests for process error handling and non-zero exit codes (#672).
- **Documentation**: Published security and sandboxing guidelines in `docs/SECURITY.md` (#673).
- **Phase 3 Regression Suite**: Capstone regression tests for execution safety and sandboxing (#674).

---

### Phase 4: Full Editor & String Manipulation Engine (PRs #675–#690)

_Co-authored by Rayapureddy Nithin <rayapureddynithin@gmail.com>_

- **String Replacement**: Implemented `edit_file` with search and replace engine (#675).
- **Replacement Tests**: Unit tests for exact string replacement (#676).
- **Ambiguity Detection**: Threw informative errors on multiple search matches without `replaceAll` (#677).
- **Ambiguity Tests**: Unit tests for ambiguity detection and resolution (#678).
- **Line Range Targeting**: Constrained string replacement to `startLine` and `endLine` bounds (#679).
- **Line Range Tests**: Unit tests for line-range bounded edits (#680).
- **Whitespace Tolerance**: Supported flexible whitespace and indentation matching (#681).
- **Whitespace Tests**: Unit tests for flexible indentation search (#682).
- **Multi-Hunk Edits**: Supported atomic multi-chunk replacements with rollback (#683).
- **Multi-Hunk Tests**: Unit tests for multi-hunk atomic replacement and rollback (#684).
- **EOL Preservation**: Preserved CRLF and LF line endings during edits (#685).
- **EOL Tests**: Unit tests for EOL detection and normalization (#686).
- **Documentation**: Published editor architecture in `docs/EDITOR.md` (#687).
- **BOM Preservation**: Handled UTF-8 BOM encoding transparently (#688).
- **Unicode Safety**: Added unit tests for multi-byte Unicode and emoji editing (#689).
- **Phase 4 Regression Suite**: Capstone regression tests for editor engine (#690).

---

### Phase 5: Multi-Language Advisory Test & Validation Runner (PRs #691–#706)

_Co-authored by Vaibhav Pandey <aryanpandey392@gmail.com>_

- **Validation Runner**: Added `runAdvisoryValidation` orchestrator (#691).
- **Runner Tests**: Unit tests for validation runner orchestration (#692).
- **Ecosystem Detection**: Auto-detected pnpm, yarn, bun, and npm lockfiles (#693).
- **JS Detection Tests**: Unit tests for JavaScript package manager detection (#694).
- **Compiled Languages**: Supported Go (`go test`), Rust (`cargo test`), Python (`pytest`), .NET, Gradle, Maven, and Makefiles (#695–#698).
- **Validation Capping**: Capped validation log output at 500KB (#699).
- **Capping Tests**: Unit tests for validation output truncation (#700).
- **Output Parsing**: Structured test summary metrics parsing (passed, failed, skipped, duration) (#701).
- **Summary Tests**: Unit tests for test runner summary parsing (#702).
- **Custom Overrides**: Added `scout.json` configuration file supporting custom validation pipelines (#703).
- **Override Tests**: Unit tests for `scout.json` configuration overrides (#704).
- **Documentation**: Published validation runner specification in `docs/VALIDATION.md` (#705).
- **Phase 5 Regression Suite**: Capstone regression tests for multi-language validation pipelines (#706).

---

### Phase 6: Dynamic Workspace Skills & Context Engine (PRs #707–#722)

_Co-authored by Vaibhav Pandey <aryanpandey392@gmail.com>_

- **Skills Discovery**: Discovered `.scout/skills/*.md` markdown guides (#707).
- **Skills Discovery Tests**: Unit tests for skills file discovery (#708).
- **Frontmatter Parsing**: Extracted YAML metadata, triggers (`ALWAYS`, `CONDITIONAL`), and tags (#709).
- **Frontmatter Tests**: Unit tests for YAML frontmatter parsing (#710).
- **`list_skills` Tool**: Exposed `list_skills` MCP tool (#711).
- **Tool Tests**: Unit tests for `list_skills` MCP tool (#712).
- **TF-IDF Relevance**: Ranked conditional skills using TF-IDF term frequency relevance against task descriptions (#713).
- **Relevance Tests**: Unit tests for TF-IDF relevance scoring (#714).
- **Tag & Language Filtering**: Filtered skills by programming language and domain tags (#715).
- **Filtering Tests**: Unit tests for skills filtering (#716).
- **Prompt Injection**: Injected relevant skills into MCP system prompts and instructions (#717).
- **Prompt Injection Tests**: Unit tests for prompt construction (#718).
- **Documentation**: Published skills architecture and formatting guide in `docs/SKILLS_AND_PROMPTS.md` (#719).
- **Parser Resilience**: Handled corrupted YAML, missing delimiters, and syntax errors gracefully (#720).
- **Resilience Tests**: Unit tests for skills parser error recovery (#721).
- **Phase 6 Regression Suite**: Capstone regression tests for skills discovery and relevance (#722).

---

### Phase 7: Real-Time MCP Protocol Resources & Telemetry (PRs #723–#738)

_Co-authored by Vaibhav Pandey <aryanpandey392@gmail.com>_

- **MCP Resources**: Exposed `scout://sessions/{session_id}/status`, `scout://sessions/{session_id}/diff`, `scout://sessions/{session_id}/evidence`, and `scout://skills` (#723).
- **Resource Tests**: Unit tests for MCP resource listing and reading (#724).
- **Resource Templates**: Added parameterized resource templates (`scout://sessions/{session_id}/...`) (#725).
- **Template Tests**: Unit tests for resource template expansion (#726).
- **Resource Subscriptions**: Supported client notifications on session diff and status updates (#727).
- **Subscription Tests**: Unit tests for resource change subscriptions (#728).
- **Progress Notifications**: Supported `progressToken` in `run_command` and `submit_for_review` via `notifications/progress` (#729).
- **Progress Tests**: Unit tests for progress token resolution and delivery (#730).
- **Resource Profiling**: Recorded peak memory (`peak_rss_bytes`) and execution duration (#731).
- **Timeline Events**: Recorded structured session events (`START`, `EDIT`, `EXEC`, `SUBMIT`, `BLOCK`, `CANCEL`) (#732).
- **Telemetry Tests**: Unit tests for timeline event recording and metric aggregation (#733).
- **Export Bundle**: Added `export_session_bundle` MCP tool generating offline audit archives (#734).
- **Bundle Tests**: Unit tests for session bundle generation (#735).
- **Chunked File Streaming**: Implemented UTF-8 boundary-safe streaming file reader (#736).
- **Documentation**: Published MCP resources and telemetry specification in `docs/RESOURCES_AND_TELEMETRY.md` (#737).
- **Phase 7 Regression Suite**: Capstone regression tests for resources, telemetry, and progress tokens (#738).

---

### Phase 8: Hardening, Packaging, CLI & Release Readiness (PRs #739–#754)

_Co-authored by Vaibhav Pandey <aryanpandey392@gmail.com>_

- **`scout-mcp doctor`**: Built-in CLI diagnostic command verifying Node version, Git version, worktree support, and filesystem permissions (#739).
- **Doctor Tests**: Unit tests for CLI diagnostic checks (#740).
- **Cross-Platform Shell Resolution**: Added Windows `cmd.exe` command resolution and argument quoting (#741).
- **Shell Tests**: Unit tests for cross-platform shell command resolution (#742).
- **Tsup Bundling**: Configured standalone ESM bundle with sourcemaps, Node 18 target, and tree-shaking (#743).
- **CLI Flags**: Supported `--version` (`-v`) and `--help` (`-h`) flags and command dispatching (#744).
- **CLI Tests**: Unit tests for argument parsing and CLI help output (#745).
- **Client Setup Guides**: Created configuration documentation for Claude Desktop, Cursor, Cline, and Windsurf in `docs/CLIENT_SETUP_GUIDE.md` (#746).
- **Automated CI Workflow**: Configured GitHub Actions CI workflow in `.github/workflows/mcp-ci.yml` (#747).
- **Multi-OS & Node Matrix**: Added cross-platform CI matrix testing across Node 18, 20, 22 on Ubuntu, macOS, and Windows (#748).
- **Architectural Specification**: Published Scout MCP v2 Complete Architectural Specification in `docs/mcp/SPECIFICATION.md` (#749).
- **Autonomous Agent E2E Simulation**: Added complete agent lifecycle integration test simulating worktree creation, code reading, editing, testing, and submission in `src/agentSimulation.test.ts` (#750).
- **Performance Benchmarks**: Created benchmark suite demonstrating ~1.87ms command overhead (sub-50ms) and sub-1ms file streaming in `src/benchmark.test.ts` (#751).
- **v2.2.0 Changelog**: Compiled comprehensive changelog cataloging all 128 pull requests and co-authors (#752).
