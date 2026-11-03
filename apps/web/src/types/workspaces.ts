/**
 * Open Source Scout - Workspaces Data Model & Types
 *
 * Defines schema types and validation logic for Workspaces, App Launcher Links,
 * and Zero-Knowledge Credential Vault entities.
 */

import type { EncryptedPayload } from '../utils/cryptoVault';

export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceLink {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  url: string;
  icon_url: string | null;
  section_name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceCredential {
  id: string;
  workspace_id: string;
  user_id: string;
  service_name: string;
  username: string;
  encrypted_data: EncryptedPayload;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceWithRelations extends Workspace {
  links: WorkspaceLink[];
  credentials: WorkspaceCredential[];
}

export interface WorkspaceSection {
  name: string;
  links: WorkspaceLink[];
}

// Input Data Transfer Objects (DTOs)

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface CreateLinkInput {
  workspace_id: string;
  title: string;
  url: string;
  icon_url?: string;
  section_name?: string;
  position?: number;
}

export interface UpdateLinkInput {
  title?: string;
  url?: string;
  icon_url?: string;
  section_name?: string;
  position?: number;
}

export interface CreateCredentialInput {
  workspace_id: string;
  service_name: string;
  username: string;
  encrypted_data: EncryptedPayload;
  notes?: string;
}

export interface UpdateCredentialInput {
  service_name?: string;
  username?: string;
  encrypted_data?: EncryptedPayload;
  notes?: string;
}

// Validation Helpers

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

export function validateLinkInput(input: CreateLinkInput): { valid: boolean; error?: string } {
  if (!input.title || input.title.trim().length === 0) {
    return { valid: false, error: 'Link title is required.' };
  }
  if (!input.url || input.url.trim().length === 0) {
    return { valid: false, error: 'URL is required.' };
  }
  try {
    const parsed = new URL(input.url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'URL must use http or https protocol.' };
    }
  } catch {
    return { valid: false, error: 'Invalid URL format.' };
  }
  return { valid: true };
}

export function validateCredentialInput(input: CreateCredentialInput): {
  valid: boolean;
  error?: string;
} {
  if (!input.service_name || input.service_name.trim().length === 0) {
    return { valid: false, error: 'Service name is required.' };
  }
  if (!input.username || input.username.trim().length === 0) {
    return { valid: false, error: 'Username / ID is required.' };
  }
  if (!input.encrypted_data || !input.encrypted_data.data || !input.encrypted_data.iv) {
    return { valid: false, error: 'Encrypted payload is missing or incomplete.' };
  }
  return { valid: true };
}
