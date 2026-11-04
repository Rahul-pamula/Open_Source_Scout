import React from 'react';
import { Layers, Plus, Sparkles, Upload } from 'lucide-react';

interface WorkspaceEmptyStateProps {
  onAddFirstLink: () => void;
  onLoadStarterPack?: () => void;
  onImportBackup?: () => void;
}

/** Closes #806: Clean onboarding illustration for empty workspace with quick actions */
export const WorkspaceEmptyState: React.FC<WorkspaceEmptyStateProps> = ({
  onAddFirstLink,
  onLoadStarterPack,
  onImportBackup,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-14 text-center border-2 border-dashed border-zinc-300 rounded-3xl bg-white shadow-xs hover:border-emerald-500/40 transition-all duration-300">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 mb-4 shadow-xs">
        <Layers size={32} />
      </div>
      <h3 className="text-base font-bold text-zinc-900">Your Workspace is Empty</h3>
      <p className="mt-1 text-xs text-zinc-500 max-w-sm leading-relaxed">
        Centrally launch internal dashboards, Google Docs, HRMS tools, and cloud repositories in
        1-click.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onAddFirstLink}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
        >
          <Plus size={16} />
          <span>Add Custom Link</span>
        </button>

        {onLoadStarterPack && (
          <button
            type="button"
            onClick={onLoadStarterPack}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold rounded-xl transition border border-zinc-200 active:scale-95 cursor-pointer"
          >
            <Sparkles size={14} className="text-emerald-600" />
            <span>Load Developer Starter Pack</span>
          </button>
        )}

        {onImportBackup && (
          <button
            type="button"
            onClick={onImportBackup}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 text-zinc-600 hover:text-zinc-900 text-xs font-medium transition cursor-pointer"
          >
            <Upload size={14} />
            <span>Restore Backup</span>
          </button>
        )}
      </div>
    </div>
  );
};
