/** Closes #792: Offline cache hydration and backup serializer */
export const workspaceCacheService = {
  backupAll(workspaces: any[], links: Record<string, any[]>): string {
    const payload = { workspaces, links, timestamp: Date.now() };
    return JSON.stringify(payload, null, 2);
  },
  hydrateFromBackup(rawJson: string): { workspaces: any[]; links: Record<string, any[]> } {
    const parsed = JSON.parse(rawJson);
    return {
      workspaces: parsed.workspaces || [],
      links: parsed.links || {},
    };
  },
};
