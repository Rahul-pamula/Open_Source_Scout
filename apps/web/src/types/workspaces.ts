import type { EncryptedPayload } from '../utils/cryptoVault';

export interface Workspace {
  id: string;
  user_id?: string;
  name: string;
  description?: string | null;
  icon?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceLink {
  id: string;
  workspace_id: string;
  user_id?: string;
  title: string;
  url: string;
  icon_url?: string | null;
  section_name?: string;
  position?: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceCredential {
  id: string;
  workspace_id: string;
  user_id?: string;
  service_name: string;
  identifier?: string;
  username?: string;
  encrypted_secret?: string;
  encrypted_data?: EncryptedPayload;
  iv?: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

export function validateWorkspaceInput(input: CreateWorkspaceInput): {
  valid: boolean;
  error?: string;
} {
  if (!input.name || input.name.trim().length === 0) {
    return { valid: false, error: 'Workspace name is required.' };
  }
  if (input.name.trim().length > 100) {
    return { valid: false, error: 'Workspace name cannot exceed 100 characters.' };
  }
  return { valid: true };
}
