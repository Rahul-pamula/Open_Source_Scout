import { Workspace } from '../types/workspace';

/** Closes #784: Workspace CRUD service */
export const workspaceService = {
  async listWorkspaces(): Promise<Workspace[]> {
    try {
      const cached = localStorage.getItem('scout_workspaces_list');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
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
    const existing = await this.listWorkspaces();
    existing.push(newWs);
    try {
      localStorage.setItem('scout_workspaces_list', JSON.stringify(existing));
    } catch (e) {}
    return newWs;
  },
  async deleteWorkspace(id: string): Promise<boolean> {
    const existing = await this.listWorkspaces();
    const filtered = existing.filter((w) => w.id !== id);
    try {
      localStorage.setItem('scout_workspaces_list', JSON.stringify(filtered));
    } catch (e) {}
    return true;
  },
};
