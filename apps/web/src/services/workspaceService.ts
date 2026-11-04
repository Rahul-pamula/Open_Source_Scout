import type { Workspace } from '../types/workspaces';

let inMemoryWorkspaces: Workspace[] = [];

/** Closes #784 & #793: Workspace CRUD service with memory fallback */
export const workspaceService = {
  async listWorkspaces(): Promise<Workspace[]> {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem) {
        const cached = localStorage.getItem('scout_workspaces_list');
        if (cached) return JSON.parse(cached);
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
    inMemoryWorkspaces = inMemoryWorkspaces.filter((w) => w.id !== id);
    try {
      if (typeof localStorage !== 'undefined' && localStorage.setItem) {
        localStorage.setItem('scout_workspaces_list', JSON.stringify(inMemoryWorkspaces));
      }
    } catch (e) {}
    return true;
  },
};
