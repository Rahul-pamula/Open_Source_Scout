import { WorkspaceLink } from '../types/workspace';

/** Closes #785: Workspace link CRUD service */
export const workspaceLinkService = {
  async listLinks(workspaceId: string): Promise<WorkspaceLink[]> {
    try {
      const cached = localStorage.getItem(`scout_links_${workspaceId}`);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  },
  async addLink(
    workspaceId: string,
    link: Omit<WorkspaceLink, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>,
  ): Promise<WorkspaceLink> {
    const newLink: WorkspaceLink = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'link_' + Date.now(),
      workspace_id: workspaceId,
      title: link.title,
      url: link.url,
      section_name: link.section_name || 'General',
      position: link.position || 0,
      icon_url: link.icon_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const existing = await this.listLinks(workspaceId);
    existing.push(newLink);
    try {
      localStorage.setItem(`scout_links_${workspaceId}`, JSON.stringify(existing));
    } catch (e) {}
    return newLink;
  },
  async deleteLink(workspaceId: string, linkId: string): Promise<boolean> {
    const existing = await this.listLinks(workspaceId);
    const filtered = existing.filter((l) => l.id !== linkId);
    try {
      localStorage.setItem(`scout_links_${workspaceId}`, JSON.stringify(filtered));
    } catch (e) {}
    return true;
  },
};
