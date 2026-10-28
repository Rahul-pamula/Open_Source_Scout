/**
 * Scout MCP Resources registry and handler functions.
 * Exposes real-time session artifacts (diffs, evidence, status) and project skills
 * via standard Model Context Protocol scout:// URI schemes.
 */

import { matchesSessionDiffUri, readSessionDiffResource } from './resources/diffResource.js';
import { matchesSessionStatusUri, readSessionStatusResource } from './resources/statusResource.js';
import { matchesSessionEvidenceUri, readSessionEvidenceResource } from './resources/evidenceResource.js';

export interface ScoutResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface ScoutResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export const SCOUT_RESOURCE_TEMPLATES: ScoutResourceTemplate[] = [
  {
    uriTemplate: 'scout://sessions/{session_id}/diff',
    name: 'Session Working Tree Git Diff',
    description: 'Current unstaged and staged git changes for an active Scout session',
    mimeType: 'text/x-diff',
  },
  {
    uriTemplate: 'scout://sessions/{session_id}/status',
    name: 'Session Status & Health Metadata',
    description: 'Real-time lifecycle state, heartbeat timestamps, and workspace metadata for a session',
    mimeType: 'application/json',
  },
  {
    uriTemplate: 'scout://sessions/{session_id}/evidence',
    name: 'Session Evidence & Validation Telemetry',
    description: 'Collected commands, touched files, diffs, and test results recorded in evidence.json',
    mimeType: 'application/json',
  },
];

export const STATIC_SCOUT_RESOURCES: ScoutResourceDefinition[] = [
  {
    uri: 'scout://skills',
    name: 'Project Development Skills',
    description: 'List of all contextual engineering skills and guidelines configured in .scout/skills',
    mimeType: 'application/json',
  },
];

/**
 * Returns static list of advertised Scout resources.
 */
export function listScoutResources(): ScoutResourceDefinition[] {
  return [...STATIC_SCOUT_RESOURCES];
}

/**
 * Returns dynamic resource templates for parameterized scout:// URIs.
 */
export function listScoutResourceTemplates(): ScoutResourceTemplate[] {
  return [...SCOUT_RESOURCE_TEMPLATES];
}

/**
 * Verifies if a given URI belongs to the scout:// resource scheme.
 */
export function isScoutResourceUri(uri: string): boolean {
  return typeof uri === 'string' && uri.startsWith('scout://');
}

/**
 * Reads and returns contents for any supported scout:// resource URI.
 */
export async function readScoutResource(
  uri: string,
  repoCwd: string = process.cwd(),
): Promise<{ uri: string; mimeType?: string; text?: string }> {
  const diffSessionId = matchesSessionDiffUri(uri);
  if (diffSessionId) {
    return await readSessionDiffResource(diffSessionId, repoCwd);
  }

  const statusSessionId = matchesSessionStatusUri(uri);
  if (statusSessionId) {
    return await readSessionStatusResource(statusSessionId, repoCwd);
  }

  const evidenceSessionId = matchesSessionEvidenceUri(uri);
  if (evidenceSessionId) {
    return await readSessionEvidenceResource(evidenceSessionId);
  }

  throw new Error(`Resource not found: ${uri}`);
}
