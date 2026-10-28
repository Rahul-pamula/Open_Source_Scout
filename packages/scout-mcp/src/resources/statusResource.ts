/**
 * scout://sessions/{session_id}/status MCP Resource.
 * Exposes real-time session execution status, heartbeat, and worktree metadata.
 */

import { getLocalState } from '../localState.js';
import { getWorktreePath } from '../git.js';
import fs from 'fs/promises';

export const SESSION_STATUS_URI_PATTERN = /^scout:\/\/sessions\/([^/]+)\/status$/;

/**
 * Checks if the given URI matches the session status resource pattern,
 * returning the extracted session_id or null.
 */
export function matchesSessionStatusUri(uri: string): string | null {
  const match = uri.match(SESSION_STATUS_URI_PATTERN);
  return match ? match[1] : null;
}

/**
 * Reads and formats session status and metadata as application/json.
 */
export async function readSessionStatusResource(
  sessionId: string,
  repoCwd: string = process.cwd(),
): Promise<{ uri: string; mimeType: string; text: string }> {
  const state = await getLocalState(repoCwd);
  const session = state.sessions?.[sessionId];

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const workspacePath = session.workspace_path || repoCwd;
  let worktreePath = '';
  let worktreeExists = false;

  try {
    worktreePath = await getWorktreePath(sessionId, workspacePath);
    const stat = await fs.stat(worktreePath);
    worktreeExists = stat.isDirectory();
  } catch {
    worktreeExists = false;
  }

  const payload = {
    session_id: sessionId,
    status: session.status,
    task_description: session.task_description,
    source: session.source,
    task_id: session.task_id || null,
    pr_url: session.pr_url || null,
    blocked_reason: session.blocked_reason || null,
    last_heartbeat_at: session.last_heartbeat_at || null,
    created_at: session.created_at || null,
    starting_commit_hash: session.starting_commit_hash,
    workspace_path: workspacePath,
    worktree_path: worktreePath || null,
    worktree_exists: worktreeExists,
  };

  return {
    uri: `scout://sessions/${sessionId}/status`,
    mimeType: 'application/json',
    text: JSON.stringify(payload, null, 2),
  };
}
