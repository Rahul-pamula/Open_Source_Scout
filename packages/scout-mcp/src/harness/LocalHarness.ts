/**
 * LocalHarness
 *
 * Owns and coordinates the full lifecycle of a local Scout execution session:
 *   - Session lifecycle  (start, heartbeat, stale detection, cancel)
 *   - Worktree creation and cleanup
 *   - Process management (delegating to ProcessManager)
 *   - Evidence recording
 *   - Advisory validation
 *
 * The MCP index.ts is a thin interface that calls these methods — it does NOT
 * contain business logic.
 *
 * Supabase cloud sync is kept as an optional side-effect: callers pass an
 * optional `CloudSyncFn` and the harness fires it after the local operation
 * succeeds.  Failures in the cloud sync are logged but never surface as errors.
 */

import { randomUUID } from 'crypto';
import { ProcessManager } from '../harness.js';
import { getGitInfo, createWorktree, removeWorktree, getGitDiff, getChangedFiles } from '../git.js';
import {
  getOrCreateLocalSession,
  checkStaleSessions,
  findStaleSession,
  processLocalSubmit,
  processLocalMarkBlocked,
  updateLocalHeartbeat,
} from '../localState.js';
import {
  recordGitDiff,
  recordChangedFiles,
  recordValidationResults,
} from '../evidence.js';
import { runAdvisoryValidation } from '../validation.js';
import { loadSkills } from '../skills.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface InitializeResult {
  session_id: string;
  starting_commit_hash: string;
  worktree_path: string;
  skills: ReturnType<typeof loadSkills>;
  task: { description: string };
  recovered_from_stale_session?: string;
  system_instructions: string;
}

export interface HeartbeatResult {
  found: boolean;
}

export interface SubmitResult {
  idempotent: boolean;
  advisory_validation: Awaited<ReturnType<typeof runAdvisoryValidation>>;
}

export interface MarkBlockedResult {
  idempotent: boolean;
}

export interface RunCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

/** Optional async cloud-sync function.  Errors are swallowed. */
export type CloudSyncFn = () => Promise<void>;

// ---------------------------------------------------------------------------
// LocalHarness
// ---------------------------------------------------------------------------

export class LocalHarness {
  private readonly processManager: ProcessManager;

  constructor(processManager?: ProcessManager) {
    this.processManager = processManager ?? new ProcessManager();
  }

  // -------------------------------------------------------------------------
  // initialize_execution
  // -------------------------------------------------------------------------

  /**
   * Starts a new execution session.
   *
   * Responsibilities:
   *  1. Run stale-session detection so old sessions do not block new ones.
   *  2. Allocate a new UUID session ID.
   *  3. Persist initial local state (heartbeat timestamp set immediately).
   *  4. Create a dedicated git worktree for the session.
   *  5. Load skills from the repository.
   */
  async initializeExecution(
    taskDescription: string,
    source: string = 'manual',
    taskId?: string,
    cloudSync?: CloudSyncFn,
  ): Promise<InitializeResult> {
    const gitInfo = await getGitInfo();

    // Stale-session detection runs before creating anything new.
    await checkStaleSessions();
    const staleSessionId = await findStaleSession();
    if (staleSessionId) {
      console.error(
        `[LocalHarness] Detected stale session ${staleSessionId}. Creating a fresh session.`,
      );
    }

    const sessionId = randomUUID();

    await getOrCreateLocalSession(
      sessionId,
      gitInfo.commitHash,
      taskDescription,
      source,
      taskId,
    );

    const worktreePath = await createWorktree(sessionId);
    const skills = loadSkills();

    // Optional cloud sync — fire-and-forget, failures logged only.
    if (cloudSync) {
      cloudSync().catch((e) =>
        console.error('[LocalHarness] Cloud sync failed for initializeExecution:', e),
      );
    }

    return {
      session_id: sessionId,
      starting_commit_hash: gitInfo.commitHash,
      worktree_path: worktreePath,
      skills,
      task: { description: taskDescription },
      recovered_from_stale_session: staleSessionId ?? undefined,
      system_instructions:
        "IMPORTANT: You must use the 'read_file', 'write_file', 'edit_file', and 'run_command' MCP tools provided by scout-mcp to interact with the codebase. Do not use host IDE tools.",
    };
  }

  // -------------------------------------------------------------------------
  // run_command
  // -------------------------------------------------------------------------

  /**
   * Executes a shell command inside the session worktree, delegating to
   * ProcessManager for tracking and cancellation support.
   */
  async runCommand(
    sessionId: string,
    command: string,
    cwd: string,
  ): Promise<RunCommandResult> {
    return this.processManager.runCommand(sessionId, command, cwd);
  }

  // -------------------------------------------------------------------------
  // cancel_session
  // -------------------------------------------------------------------------

  /**
   * Kills all active processes for the session.  Does NOT remove the worktree;
   * call cleanupSession for full teardown.
   */
  async cancelSession(sessionId: string): Promise<void> {
    await this.processManager.cancelSession(sessionId);
  }

  // -------------------------------------------------------------------------
  // cleanup_session  (cancel + remove worktree)
  // -------------------------------------------------------------------------

  async cleanupSession(sessionId: string): Promise<void> {
    await this.processManager.cancelSession(sessionId);
    await removeWorktree(sessionId);
  }

  // -------------------------------------------------------------------------
  // submit_for_review
  // -------------------------------------------------------------------------

  /**
   * Transitions the session to SUBMITTED, records evidence (git diff, changed
   * files, advisory validation), then optionally syncs to the cloud.
   */
  async submitForReview(
    sessionId: string,
    worktreePath: string,
    prUrl?: string,
    cloudSync?: CloudSyncFn,
  ): Promise<SubmitResult> {
    const { idempotent } = await processLocalSubmit(sessionId, prUrl);

    if (idempotent) {
      // Return a minimal advisory result when the submission was already recorded.
      return {
        idempotent: true,
        advisory_validation: {
          validation_ran: false,
          validation_passed: true,
          stdout: 'Idempotent: submission already recorded.',
          stderr: '',
          exit_code: null,
        },
      };
    }

    // Collect evidence.
    const diff = await getGitDiff(worktreePath);
    const changedFiles = await getChangedFiles(worktreePath);
    await recordGitDiff(sessionId, diff);
    await recordChangedFiles(sessionId, changedFiles);

    // Advisory validation (runs scout:validate if present).
    const validationResult = await runAdvisoryValidation();
    await recordValidationResults(sessionId, validationResult);

    // Optional cloud sync.
    if (cloudSync) {
      cloudSync().catch((e) =>
        console.error('[LocalHarness] Cloud sync failed for submitForReview:', e),
      );
    }

    return { idempotent: false, advisory_validation: validationResult };
  }

  // -------------------------------------------------------------------------
  // session_heartbeat
  // -------------------------------------------------------------------------

  /**
   * Updates the local heartbeat timestamp and optionally syncs to the cloud.
   * Returns `found: false` when the session is not in local state (caller can
   * log a warning).
   */
  async sessionHeartbeat(
    sessionId: string,
    cloudSync?: CloudSyncFn,
  ): Promise<HeartbeatResult> {
    const found = await updateLocalHeartbeat(sessionId);

    if (!found) {
      console.error(
        `[LocalHarness] session_heartbeat called for unknown session ${sessionId}`,
      );
    }

    if (cloudSync) {
      cloudSync().catch((e) =>
        console.error('[LocalHarness] Cloud sync failed for sessionHeartbeat:', e),
      );
    }

    return { found };
  }

  // -------------------------------------------------------------------------
  // mark_blocked
  // -------------------------------------------------------------------------

  /**
   * Marks the session as BLOCKED and optionally syncs to the cloud.
   */
  async markBlocked(
    sessionId: string,
    reason: string,
    cloudSync?: CloudSyncFn,
  ): Promise<MarkBlockedResult> {
    const { idempotent } = await processLocalMarkBlocked(sessionId, reason);

    if (cloudSync) {
      cloudSync().catch((e) =>
        console.error('[LocalHarness] Cloud sync failed for markBlocked:', e),
      );
    }

    return { idempotent };
  }

  // -------------------------------------------------------------------------
  // Expose processManager for advanced callers (e.g. tests)
  // -------------------------------------------------------------------------

  getProcessManager(): ProcessManager {
    return this.processManager;
  }
}

/** Singleton harness used by the MCP server. */
export const localHarness = new LocalHarness();
