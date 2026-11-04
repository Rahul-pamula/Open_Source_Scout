import { useState, useEffect, useCallback } from 'react';
import type { Workspace } from '../types/workspaces';
import { workspaceService } from '../services/workspaceService';

/** Closes #789 & #790: Custom hook with optimistic mutation updates */
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

  const optimisticAddWorkspace = (ws: Workspace) => {
    setWorkspaces((prev) => [...prev, ws]);
  };

  const optimisticRemoveWorkspace = (id: string) => {
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
  };

  return {
    workspaces,
    loading,
    refresh,
    optimisticAddWorkspace,
    optimisticRemoveWorkspace,
  };
}
