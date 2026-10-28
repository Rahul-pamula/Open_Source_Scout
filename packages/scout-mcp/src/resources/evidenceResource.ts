/**
 * scout://sessions/{session_id}/evidence MCP Resource.
 * Exposes structured session evidence (executed commands, changed files, diffs, validation metrics).
 */

import { getEvidence } from '../evidence.js';

export const SESSION_EVIDENCE_URI_PATTERN = /^scout:\/\/sessions\/([^/]+)\/evidence$/;

/**
 * Checks if the given URI matches the session evidence resource pattern,
 * returning the extracted session_id or null.
 */
export function matchesSessionEvidenceUri(uri: string): string | null {
  const match = uri.match(SESSION_EVIDENCE_URI_PATTERN);
  return match ? match[1] : null;
}

/**
 * Reads and formats session evidence log as application/json.
 */
export async function readSessionEvidenceResource(
  sessionId: string,
): Promise<{ uri: string; mimeType: string; text: string }> {
  const evidence = await getEvidence(sessionId);

  return {
    uri: `scout://sessions/${sessionId}/evidence`,
    mimeType: 'application/json',
    text: JSON.stringify(evidence, null, 2),
  };
}
