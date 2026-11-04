import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { Workspace } from '../types/workspaces';

/** Closes #791: Global Workspace Context provider */
interface WorkspaceContextValue {
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (ws: Workspace | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  return (
    <WorkspaceContext.Provider value={{ activeWorkspace, setActiveWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspaceContext = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspaceContext must be used within a WorkspaceProvider');
  }
  return context;
};
