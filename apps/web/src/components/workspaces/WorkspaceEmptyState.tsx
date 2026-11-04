import React from 'react';
import { Layers, Plus } from 'lucide-react';

interface WorkspaceEmptyStateProps {
  onAddFirstLink: () => void;
}

/** Closes #806: Clean onboarding illustration for empty workspace */
export const WorkspaceEmptyState: React.FC<WorkspaceEmptyStateProps> = ({ onAddFirstLink }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-gray-800 rounded-3xl m-4 bg-gray-950/40">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
        <Layers size={32} />
      </div>
      <h3 className="text-base font-semibold text-white">Your Workspace is Empty</h3>
      <p className="mt-1 text-xs text-gray-400 max-w-sm">
        Add external links (Google Docs, ClickUp, HRMS, GitHub repositories) to launch them in
        1-click.
      </p>
      <button
        type="button"
        onClick={onAddFirstLink}
        className="mt-5 inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition shadow-lg shadow-emerald-600/20"
      >
        <Plus size={16} />
        <span>Add Your First Link</span>
      </button>
    </div>
  );
};
