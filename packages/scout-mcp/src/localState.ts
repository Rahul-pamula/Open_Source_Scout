import fs from 'fs/promises';
import path from 'path';

/** Default stale timeout in milliseconds (30 minutes). */
export const DEFAULT_STALE_TIMEOUT_MS = 30 * 60 * 1000;

function getLocalStateDir(cwd: string = process.cwd()) {
  return path.join(cwd, '.scout-tmp');
}

function getLocalStateFile(cwd: string = process.cwd()) {
  return path.join(getLocalStateDir(cwd), 'state.json');
}

export interface SessionState {
  status: 'ACTIVE' | 'SUBMITTED' | 'BLOCKED' | 'STALE' | 'CANCELLED';
  starting_commit_hash: string;
  task_description: string;
  source: string;
  task_id?: string;
  pr_url?: string;
  blocked_reason?: string;
  last_heartbeat_at?: string;
  workspace_path?: string;
}

export interface StateFile {
  sessions: Record<string, SessionState>;
}

export async function getLocalState(cwd: string = process.cwd()): Promise<StateFile> {
  try {
    const data = await fs.readFile(getLocalStateFile(cwd), 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { sessions: {} };
  }
}

export async function acquireLock(
  lockFile: string,
  maxRetries: number = 20,
  delayMs: number = 25,
): Promise<() => Promise<void>> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const handle = await fs.open(lockFile, 'wx');
      await handle.write(String(process.pid));
      await handle.close();
      return async () => {
        try {
          await fs.unlink(lockFile);
        } catch {}
      };
    } catch (err: any) {
      if (err.code === 'EEXIST') {
        try {
          const stat = await fs.stat(lockFile);
          if (Date.now() - stat.mtimeMs > 5000) {
            await fs.unlink(lockFile);
            continue;
          }
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        throw err;
      }
    }
  }
  return async () => {
    try {
      await fs.unlink(lockFile);
    } catch {}
  };
}

export async function saveLocalState(state: StateFile, cwd: string = process.cwd()): Promise<void> {
  const dir = getLocalStateDir(cwd);
  const file = getLocalStateFile(cwd);
  const lockFile = `${file}.lock`;
  await fs.mkdir(dir, { recursive: true });

  const releaseLock = await acquireLock(lockFile);
  try {
    const tmpFile = `${file}.${process.pid}.${Date.now()}-${Math.random().toString(36).slice(2, 6)}.tmp`;
    await fs.writeFile(tmpFile, JSON.stringify(state, null, 2), 'utf8');
    await fs.rename(tmpFile, file);
  } finally {
    await releaseLock();
  }
}

let pendingFlushTimer: NodeJS.Timeout | null = null;
let pendingState: StateFile | null = null;
let pendingCwd: string = process.cwd();

/**
 * Flush any queued debounced state write immediately to disk.
 */
export async function flushLocalState(): Promise<void> {
  if (pendingFlushTimer) {
    clearTimeout(pendingFlushTimer);
    pendingFlushTimer = null;
  }
  if (pendingState) {
    const stateToSave = pendingState;
    pendingState = null;
    await saveLocalState(stateToSave, pendingCwd);
  }
}

/**
 * Queue a state write with configurable debounce interval (default 50ms).
 */
export function queueLocalStateFlush(
  state: StateFile,
  delayMs: number = 50,
  cwd: string = process.cwd(),
): Promise<void> {
  pendingState = state;
  pendingCwd = cwd;
  return new Promise((resolve) => {
    if (pendingFlushTimer) {
      clearTimeout(pendingFlushTimer);
    }
    pendingFlushTimer = setTimeout(async () => {
      pendingFlushTimer = null;
      if (pendingState) {
        const stateToSave = pendingState;
        pendingState = null;
        await saveLocalState(stateToSave, cwd);
      }
      resolve();
    }, delayMs);
  });
}

/**
 * Update the `last_heartbeat_at` timestamp for a session in local state.
 * Returns true if the session was found and updated, false otherwise.
 */
export async function updateLocalHeartbeat(sessionId: string, cwd: string = process.cwd()): Promise<boolean> {
  const state = await getLocalState(cwd);
  const session = state.sessions[sessionId];
  if (!session) {
    return false;
  }
  session.last_heartbeat_at = new Date().toISOString();
  await saveLocalState(state, cwd);
  return true;
}

/**
 * Update or record the workspace directory path for a session.
 */
export async function updateSessionWorkspace(
  sessionId: string,
  workspacePath: string,
  cwd: string = process.cwd(),
): Promise<boolean> {
  const state = await getLocalState(cwd);
  const session = state.sessions[sessionId];
  if (!session) {
    return false;
  }
  session.workspace_path = workspacePath;
  await saveLocalState(state, cwd);
  return true;
}

/**
 * Mark sessions as STALE when their last heartbeat is older than `timeoutMs`.
 *
 * Only ACTIVE sessions are eligible to become STALE. SUBMITTED/BLOCKED/STALE/CANCELLED
 * sessions are left untouched.
 *
 * A session that has never sent a heartbeat (last_heartbeat_at is absent) is
 * treated as if the heartbeat was at epoch 0, i.e. it is immediately stale.
 *
 * @returns The number of sessions transitioned to STALE.
 */
export async function checkStaleSessions(
  timeoutMs: number = DEFAULT_STALE_TIMEOUT_MS,
  cwd: string = process.cwd(),
): Promise<number> {
  const state = await getLocalState(cwd);
  const now = Date.now();
  let staleCount = 0;

  for (const [, session] of Object.entries(state.sessions)) {
    if (session.status !== 'ACTIVE') {
      continue;
    }

    const lastBeat = session.last_heartbeat_at
      ? new Date(session.last_heartbeat_at).getTime()
      : 0;

    if (now - lastBeat >= timeoutMs) {
      session.status = 'STALE';
      staleCount++;
    }
  }

  if (staleCount > 0) {
    await saveLocalState(state, cwd);
  }

  return staleCount;
}

/**
 * Find the ID of any STALE session in the state file (regardless of commit).
 * Used by initialize_execution to detect and recover from crashed sessions.
 * Returns null when no stale session exists.
 */
export async function findStaleSession(
  cwd: string = process.cwd(),
): Promise<string | null> {
  const state = await getLocalState(cwd);
  for (const [id, session] of Object.entries(state.sessions)) {
    if (session.status === 'STALE') {
      return id;
    }
  }
  return null;
}

/**
 * Get or create a local session for the given sessionId.
 *
 * Key behaviours:
 * - SUBMITTED session → throws (cannot re-use).
 * - STALE session → throws so the caller can create a fresh session instead.
 * - ACTIVE session with mismatched commit → throws (legacy stale-commit check).
 * - Otherwise returns the existing session ID unchanged.
 * - New sessions get an initial last_heartbeat_at timestamp.
 */
export async function getOrCreateLocalSession(
  sessionId: string,
  commitHash: string,
  taskDescription: string,
  source: string,
  taskId?: string,
  cwd: string = process.cwd(),
  workspacePath?: string,
): Promise<string> {
  const state = await getLocalState(cwd);
  if (state.sessions[sessionId]) {
    const session = state.sessions[sessionId];
    if (session.status === 'SUBMITTED') {
      throw new Error('Task is already submitted / awaiting external review');
    }
    if (session.status === 'STALE') {
      throw new Error(`Session ${sessionId} is STALE. A new session should be created.`);
    }
    if (session.status === 'CANCELLED') {
      throw new Error(`Session ${sessionId} is CANCELLED. A new session should be created.`);
    }
    if (session.status === 'ACTIVE' && session.starting_commit_hash !== commitHash) {
      throw new Error(`Stale session detected. Active session exists with commit ${session.starting_commit_hash}, but current HEAD is ${commitHash}.`);
    }
    return sessionId;
  }
  state.sessions[sessionId] = {
    status: 'ACTIVE',
    starting_commit_hash: commitHash,
    task_description: taskDescription,
    source,
    last_heartbeat_at: new Date().toISOString(),
    workspace_path: workspacePath || cwd,
    ...(taskId ? { task_id: taskId } : {}),
  };
  await saveLocalState(state, cwd);
  return sessionId;
}

export async function processLocalSubmit(
  sessionId: string,
  prUrl?: string,
  cwd: string = process.cwd(),
): Promise<{ idempotent: boolean }> {
  const state = await getLocalState(cwd);
  const session = state.sessions[sessionId];

  if (!session) {
    throw new Error('Session not found in local state');
  }

  if (session.status === 'SUBMITTED') {
    return { idempotent: true };
  }

  if (session.status === 'BLOCKED') {
    throw new Error('State transition rejected: cannot submit a blocked session');
  }

  if (session.status === 'CANCELLED') {
    throw new Error('State transition rejected: cannot submit a cancelled session');
  }

  session.status = 'SUBMITTED';
  if (prUrl) {
    session.pr_url = prUrl;
  }
  await saveLocalState(state, cwd);
  return { idempotent: false };
}

export async function processLocalMarkBlocked(
  sessionId: string,
  reason: string,
  cwd: string = process.cwd(),
): Promise<{ idempotent: boolean }> {
  const state = await getLocalState(cwd);
  const session = state.sessions[sessionId];

  if (!session) {
    throw new Error('Session not found in local state');
  }

  if (session.status === 'SUBMITTED') {
    throw new Error('State transition rejected: cannot block an already submitted session');
  }

  if (session.status === 'CANCELLED') {
    throw new Error('State transition rejected: cannot block a cancelled session');
  }

  if (session.status === 'BLOCKED') {
    return { idempotent: true };
  }

  session.status = 'BLOCKED';
  session.blocked_reason = reason;
  await saveLocalState(state, cwd);
  return { idempotent: false };
}

export async function processLocalCancel(
  sessionId: string,
  cwd: string = process.cwd(),
): Promise<{ idempotent: boolean }> {
  const state = await getLocalState(cwd);
  const session = state.sessions[sessionId];

  if (!session) {
    throw new Error('Session not found in local state');
  }

  if (session.status === 'SUBMITTED') {
    throw new Error('State transition rejected: cannot cancel an already submitted session');
  }

  if (session.status === 'CANCELLED') {
    return { idempotent: true };
  }

  session.status = 'CANCELLED';
  await saveLocalState(state, cwd);
  return { idempotent: false };
}
