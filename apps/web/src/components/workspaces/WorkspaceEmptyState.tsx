import React from 'react';
import { Layers, Plus } from 'lucide-react';

interface WorkspaceEmptyStateProps {
  onAddFirstLink: () => void;
}

/** Closes #806: Clean onboarding illustration for empty workspace */
export const WorkspaceEmptyState: React.FC<WorkspaceEmptyStateProps> = ({ onAddFirstLink }) => {
  return (
    <div className="flex flex-col items-center justify-center p-14 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900 shadow-sm hover:border-emerald-500/40 transition-all duration-300">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 shadow-sm">
        <Layers size={32} />
      </div>
      <h3 className="text-base font-bold text-zinc-900 dark:text-white">Your Workspace is Empty</h3>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
        Add external links (Google Docs, ClickUp, HRMS, GitHub repositories) to launch them in
        1-click.
      </p>
      <button
        type="button"
        onClick={onAddFirstLink}
        className="mt-6 inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-emerald-600/20 active:scale-95"
      >
        <Plus size={16} />
        <span>Add Your First Link</span>
      </button>
    </div>
  );
};
