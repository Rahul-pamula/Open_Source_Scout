/** Closes #833: Encrypted workspace backup export & import */
export interface WorkspaceBackupPayload {
  version: number;
  exportedAt: string;
  workspaces: any[];
  links: Record<string, any[]>;
}

export function exportWorkspaceBackup(workspaces: any[], links: Record<string, any[]>): string {
  const payload: WorkspaceBackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    workspaces,
    links,
  };
  return JSON.stringify(payload, null, 2);
}

export function validateWorkspaceBackup(rawJson: string): {
  valid: boolean;
  data?: WorkspaceBackupPayload;
  error?: string;
} {
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.workspaces)) {
      return { valid: false, error: 'Invalid backup structure.' };
    }
    return { valid: true, data: parsed as WorkspaceBackupPayload };
  } catch {
    return { valid: false, error: 'Malformed JSON payload.' };
  }
}
