import React from 'react';
import type { WorkspaceLink } from '../../types/workspaces';
import { ExternalLink, Copy, Edit3, Trash2 } from 'lucide-react';

interface AppContextMenuProps {
  x: number;
  y: number;
  link: WorkspaceLink;
  onClose: () => void;
  onEdit?: (link: WorkspaceLink) => void;
  onDelete?: (link: WorkspaceLink) => void;
}

/** Closes #804: Context menu with direct launch, copy, edit, delete */
export const AppContextMenu: React.FC<AppContextMenuProps> = ({
  x,
  y,
  link,
  onClose,
  onEdit,
  onDelete,
}) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(link.url);
    onClose();
  };

  return (
    <div
      style={{ top: y, left: x }}
      className="fixed z-50 w-44 bg-gray-900 border border-gray-700/80 rounded-xl shadow-2xl py-1.5 text-xs text-gray-200 select-none animate-in fade-in duration-100"
      onMouseLeave={onClose}
    >
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClose}
        className="flex items-center space-x-2 px-3 py-1.5 hover:bg-emerald-500/10 hover:text-emerald-400 transition"
      >
        <ExternalLink size={14} />
        <span>Open Link</span>
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-emerald-500/10 hover:text-emerald-400 transition"
      >
        <Copy size={14} />
        <span>Copy URL</span>
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={() => {
            onEdit(link);
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-gray-800 transition"
        >
          <Edit3 size={14} />
          <span>Edit Link</span>
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={() => {
            onDelete(link);
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-rose-500/10 text-rose-400 transition"
        >
          <Trash2 size={14} />
          <span>Delete</span>
        </button>
      )}
    </div>
  );
};
