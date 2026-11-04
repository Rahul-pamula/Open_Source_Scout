import { useState, useEffect, useCallback } from 'react';
import { Workspace } from '../types/workspace';
import { workspaceService } from '../services/workspaceService';

/** Closes #789: Custom hook managing workspaces lifecycle and cached states */
export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await workspaceService.listWorkspaces();
      setWorkspaces(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { workspaces, loading, refresh };
}
