import type { Workspace } from '../types/workspaces';
import { supabase, hasSupabaseConfig } from './supabase';

const DEFAULT_WORKSPACE_DATA: Workspace = {
  id: 'default-personal-workspace',
  user_id: 'default_user',
  name: 'Personal Workspace',
  description: 'Centrally manage your frequently used tools and quick links.',
  icon: 'briefcase',
  color: '#10b981',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

let inMemoryWorkspaces: Workspace[] = [];

/** Closes #784 & #793: Workspace CRUD service with Supabase sync and fallback */
export const workspaceService = {
  async listWorkspaces(): Promise<Workspace[]> {
    // 1. Try Supabase if configured
    if (hasSupabaseConfig()) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('workspaces')
            .select('*')
            .order('created_at', { ascending: true });

          if (!error && data && data.length > 0) {
            inMemoryWorkspaces = data;
            return data;
          }

          // If user exists but has no workspace, auto-provision their default Personal Workspace
          if (!error && data && data.length === 0) {
            const { data: created, error: createErr } = await supabase
              .from('workspaces')
              .insert({
                user_id: user.id,
                name: 'Personal Workspace',
                description: 'Centrally manage your frequently used tools and quick links.',
                icon: 'briefcase',
                color: '#10b981',
              })
              .select()
              .single();

            if (!createErr && created) {
              inMemoryWorkspaces = [created];
              return [created];
            }
          }
        }
      } catch (e) {
        // Fall back to local storage
      }
    }

    // 2. Try localStorage
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem) {
        const cached = localStorage.getItem('scout_workspaces_list');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            inMemoryWorkspaces = parsed;
            return parsed;
          }
        }
      }
    } catch (e) {}

    // 3. Fallback to default personal workspace so activeWorkspace is NEVER null
    if (inMemoryWorkspaces.length > 0) {
      return inMemoryWorkspaces;
    }

    inMemoryWorkspaces = [{ ...DEFAULT_WORKSPACE_DATA }];
    try {
      if (typeof localStorage !== 'undefined' && localStorage.setItem) {
        localStorage.setItem('scout_workspaces_list', JSON.stringify(inMemoryWorkspaces));
      }
    } catch (e) {}

    return inMemoryWorkspaces;
  },

  async createWorkspace(data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
  }): Promise<Workspace> {
    if (hasSupabaseConfig()) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: created, error } = await supabase
            .from('workspaces')
            .insert({
              user_id: user.id,
              name: data.name,
              description: data.description || '',
              icon: data.icon || 'Folder',
              color: data.color || '#10b981',
            })
            .select()
            .single();

          if (!error && created) {
            inMemoryWorkspaces.push(created);
            return created;
          }
        }
      } catch (e) {}
    }

    const newWs: Workspace = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'ws_' + Date.now(),
      user_id: 'default_user',
      name: data.name,
      description: data.description || '',
      icon: data.icon || 'Folder',
      color: data.color || '#10b981',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    inMemoryWorkspaces.push(newWs);
    try {
      if (typeof localStorage !== 'undefined' && localStorage.setItem) {
        localStorage.setItem('scout_workspaces_list', JSON.stringify(inMemoryWorkspaces));
      }
    } catch (e) {}
    return newWs;
  },

  async deleteWorkspace(id: string): Promise<boolean> {
    if (hasSupabaseConfig()) {
      try {
        await supabase.from('workspaces').delete().eq('id', id);
      } catch (e) {}
    }
    inMemoryWorkspaces = inMemoryWorkspaces.filter((w) => w.id !== id);
    try {
      if (typeof localStorage !== 'undefined' && localStorage.setItem) {
        localStorage.setItem('scout_workspaces_list', JSON.stringify(inMemoryWorkspaces));
      }
    } catch (e) {}
    return true;
  },
};
