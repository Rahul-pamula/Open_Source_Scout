import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Trash2 } from 'lucide-react';

interface SectionHeaderProps {
  sectionName: string;
  isCollapsed?: boolean;
  count: number;
  onToggleCollapse: () => void;
  onRename: (newName: string) => void;
  onDelete?: () => void;
}

/** Closes #800: Section header with inline edit & count */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  sectionName,
  isCollapsed = false,
  count,
  onToggleCollapse,
  onRename,
  onDelete,
}) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(sectionName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onRename(name.trim());
      setEditing(false);
    }
  };

  return (
    <div className="flex items-center justify-between py-2 px-4 border-b border-gray-800/80 mb-2">
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="text-gray-400 hover:text-emerald-400 p-0.5 rounded transition"
          aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>

        {editing ? (
          <form onSubmit={handleSubmit} className="flex items-center space-x-1">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setEditing(false)}
              autoFocus
              className="bg-gray-800 text-xs text-white px-2 py-0.5 rounded border border-emerald-500 focus:outline-none"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="group flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-white"
          >
            <span>{sectionName}</span>
            <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.2 rounded-full">
              {count}
            </span>
            <Edit2
              size={12}
              className="opacity-0 group-hover:opacity-100 text-gray-500 transition"
            />
          </button>
        )}
      </div>

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="text-gray-500 hover:text-rose-400 p-1 rounded transition"
          title="Delete Section"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
};
