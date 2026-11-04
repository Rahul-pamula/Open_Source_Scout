import type { WorkspaceLink } from '../types/workspaces';
import { supabase, hasSupabaseConfig } from './supabase';

/** Closes #785 & #786: Workspace link CRUD and Supabase sync service */
export const workspaceLinkService = {
  async listLinks(workspaceId: string): Promise<WorkspaceLink[]> {
    // 1. Try Supabase if configured and user is signed in
    if (hasSupabaseConfig()) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const query = supabase
            .from('workspace_links')
            .select('*')
            .order('position', { ascending: true });

          // If standard UUID workspace, filter by it; otherwise get user's links
          if (
            workspaceId &&
            workspaceId !== 'default-personal-workspace' &&
            /^[0-9a-f-]{36}$/i.test(workspaceId)
          ) {
            query.eq('workspace_id', workspaceId);
          } else {
            query.eq('user_id', user.id);
          }

          const { data, error } = await query;
          if (!error && data) {
            return data;
          }
        }
      } catch (e) {
        // Fall back to local storage
      }
    }

    // 2. Try localStorage
    try {
      const cached = localStorage.getItem(`scout_links_${workspaceId}`);
      if (cached) return JSON.parse(cached);
      // Also check generic cache
      const generic = localStorage.getItem('scout_links_default-personal-workspace');
      if (generic) return JSON.parse(generic);
    } catch (e) {}

    return [];
  },

  async addLink(
    workspaceId: string,
    link: Omit<WorkspaceLink, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>,
  ): Promise<WorkspaceLink> {
    // 1. Try Supabase
    if (hasSupabaseConfig()) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          // Resolve workspace UUID
          let resolvedWorkspaceId = workspaceId;
          if (!/^[0-9a-f-]{36}$/i.test(resolvedWorkspaceId)) {
            const { data: wsList } = await supabase.from('workspaces').select('id').limit(1);
            if (wsList && wsList[0]) {
              resolvedWorkspaceId = wsList[0].id;
            } else {
              const { data: newWs } = await supabase
                .from('workspaces')
                .insert({
                  user_id: user.id,
                  name: 'Personal Workspace',
                  description: 'Personal developer tools and links',
                })
                .select('id')
                .single();
              if (newWs) resolvedWorkspaceId = newWs.id;
            }
          }

          const { data: created, error } = await supabase
            .from('workspace_links')
            .insert({
              workspace_id: resolvedWorkspaceId,
              user_id: user.id,
              title: link.title,
              url: link.url,
              section_name: link.section_name || 'General',
              position: link.position || 0,
              icon_url: link.icon_url,
            })
            .select()
            .single();

          if (!error && created) {
            // Also mirror to localStorage
            const existing = await this.listLinks(workspaceId);
            try {
              localStorage.setItem(
                `scout_links_${workspaceId}`,
                JSON.stringify([...existing, created]),
              );
            } catch (e) {}
            return created;
          }
        }
      } catch (e) {}
    }

    // 2. Local fallback
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
      localStorage.setItem(`scout_links_default-personal-workspace`, JSON.stringify(existing));
    } catch (e) {}
    return newLink;
  },

  async reorderLinks(workspaceId: string, linkIds: string[]): Promise<WorkspaceLink[]> {
    const existing = await this.listLinks(workspaceId);
    const reordered = linkIds
      .map((id, index) => {
        const link = existing.find((l) => l.id === id);
        return link ? { ...link, position: index } : null;
      })
      .filter(Boolean) as WorkspaceLink[];
    try {
      localStorage.setItem(`scout_links_${workspaceId}`, JSON.stringify(reordered));
      localStorage.setItem(`scout_links_default-personal-workspace`, JSON.stringify(reordered));
    } catch (e) {}
    return reordered;
  },

  async deleteLink(workspaceId: string, linkId: string): Promise<boolean> {
    if (hasSupabaseConfig()) {
      try {
        await supabase.from('workspace_links').delete().eq('id', linkId);
      } catch (e) {}
    }

    const existing = await this.listLinks(workspaceId);
    const filtered = existing.filter((l) => l.id !== linkId);
    try {
      localStorage.setItem(`scout_links_${workspaceId}`, JSON.stringify(filtered));
      localStorage.setItem(`scout_links_default-personal-workspace`, JSON.stringify(filtered));
    } catch (e) {}
    return true;
  },
};
