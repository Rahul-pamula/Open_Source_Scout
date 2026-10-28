/**
 * scout://sessions/{session_id}/diff MCP Resource.
 * Exposes live git diff (staged, unstaged, untracked) for an active Scout session worktree.
 */

import { getWorktreePath, getGitDiff } from '../git.js';
import { getLocalState } from '../localState.js';

export const SESSION_DIFF_URI_PATTERN = /^scout:\/\/sessions\/([^/]+)\/diff$/;

/**
 * Checks if the given URI matches the session diff resource pattern,
 * returning the extracted session_id or null.
 */
export function matchesSessionDiffUri(uri: string): string | null {
  const match = uri.match(SESSION_DIFF_URI_PATTERN);
  return match ? match[1] : null;
}

/**
 * Reads and formats the live working tree diff for a specific Scout session.
 */
export async function readSessionDiffResource(
  sessionId: string,
  repoCwd: string = process.cwd(),
): Promise<{ uri: string; mimeType: string; text: string }> {
  const state = await getLocalState(repoCwd);
  const session = state.sessions?.[sessionId];
  const workspacePath = session?.workspace_path || repoCwd;

  const worktreePath = await getWorktreePath(sessionId, workspacePath);
  let diffContent = '';
  try {
    diffContent = await getGitDiff(worktreePath);
  } catch (_err) {
    // Return empty diff if worktree does not exist yet or has no diff
    diffContent = '';
  }

  return {
    uri: `scout://sessions/${sessionId}/diff`,
    mimeType: 'text/x-diff',
    text: diffContent,
  };
}
