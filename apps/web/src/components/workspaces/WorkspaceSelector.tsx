import React from 'react';
import type { Workspace } from '../../types/workspaces';
import { Folder } from 'lucide-react';

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  activeId?: string;
  onSelect: (ws: Workspace) => void;
  onCreateNew: () => void;
}

/** Closes #830: Workspace switcher dropdown */
export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
  workspaces,
  activeId,
  onSelect,
  onCreateNew,
}) => {
  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <select
          value={activeId}
          onChange={(e) => {
            if (e.target.value === '__new__') {
              onCreateNew();
            } else {
              const found = workspaces.find((w) => w.id === e.target.value);
              if (found) onSelect(found);
            }
          }}
          className="appearance-none bg-gray-800 text-xs font-semibold text-white pl-8 pr-8 py-2 rounded-xl border border-gray-700 hover:border-gray-600 focus:outline-none focus:border-emerald-500"
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
          <option value="__new__">+ Create New Workspace</option>
        </select>
        <Folder
          size={14}
          className="absolute left-2.5 top-2.5 text-emerald-400 pointer-events-none"
        />
      </div>
    </div>
  );
};
