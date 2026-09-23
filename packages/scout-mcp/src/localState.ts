import fs from 'fs/promises';
import path from 'path';

const LOCAL_STATE_DIR = path.join(process.cwd(), '.scout-tmp');
const LOCAL_STATE_FILE = path.join(LOCAL_STATE_DIR, 'state.json');

export interface SessionState {
  status: string;
  starting_commit_hash: string;
  pr_url?: string;
  blocked_reason?: string;
  last_heartbeat_at?: string;
}

export interface StateFile {
  sessions: Record<string, SessionState>;
}

export async function getLocalState(): Promise<StateFile> {
  try {
    const data = await fs.readFile(LOCAL_STATE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { sessions: {} };
  }
}

export async function saveLocalState(state: StateFile): Promise<void> {
  await fs.mkdir(LOCAL_STATE_DIR, { recursive: true });
  await fs.writeFile(LOCAL_STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

export async function getOrCreateLocalSession(sessionId: string, commitHash: string): Promise<string> {
  const state = await getLocalState();
  if (state.sessions[sessionId]) {
      const session = state.sessions[sessionId];
      if (session.status === 'SUBMITTED') {
          throw new Error('Task is already submitted / awaiting external review');
      }
      if (session.status === 'ACTIVE' && session.starting_commit_hash !== commitHash) {
          throw new Error(`Stale session detected. Active session exists with commit ${session.starting_commit_hash}, but current HEAD is ${commitHash}.`);
      }
      return sessionId;
  }
  state.sessions[sessionId] = {
      status: 'ACTIVE',
      starting_commit_hash: commitHash
  };
  await saveLocalState(state);
  return sessionId;
}

export async function processLocalSubmit(sessionId: string, prUrl?: string): Promise<{ idempotent: boolean }> {
    const state = await getLocalState();
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

    session.status = 'SUBMITTED';
    if (prUrl) {
        session.pr_url = prUrl;
    }
    await saveLocalState(state);
    return { idempotent: false };
}

export async function processLocalMarkBlocked(sessionId: string, reason: string): Promise<{ idempotent: boolean }> {
    const state = await getLocalState();
    const session = state.sessions[sessionId];
    
    if (!session) {
        throw new Error('Session not found in local state');
    }

    if (session.status === 'SUBMITTED') {
        throw new Error('State transition rejected: cannot block an already submitted session');
    }

    if (session.status === 'BLOCKED') {
        return { idempotent: true };
    }

    session.status = 'BLOCKED';
    session.blocked_reason = reason;
    await saveLocalState(state);
    return { idempotent: false };
}
