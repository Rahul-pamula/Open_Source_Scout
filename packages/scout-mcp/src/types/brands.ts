/**
 * Nominal Brand types for Scout MCP to prevent accidental argument transposition
 * (e.g. passing a workspace path where a session ID was expected).
 */

declare const __brand: unique symbol;

export type Brand<T, B> = T & { readonly [__brand]: B };

export type SessionId = Brand<string, 'SessionId'>;
export type WorkspacePath = Brand<string, 'WorkspacePath'>;
export type CommitHash = Brand<string, 'CommitHash'>;

export function toSessionId(id: string): SessionId {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new TypeError('Invalid SessionId: must be a non-empty string');
  }
  return id as SessionId;
}

export function toWorkspacePath(p: string): WorkspacePath {
  if (!p || typeof p !== 'string' || p.trim().length === 0) {
    throw new TypeError('Invalid WorkspacePath: must be a non-empty string');
  }
  return p as WorkspacePath;
}

export function toCommitHash(hash: string): CommitHash {
  if (!hash || typeof hash !== 'string' || hash.trim().length === 0) {
    throw new TypeError('Invalid CommitHash: must be a non-empty string');
  }
  return hash as CommitHash;
}
