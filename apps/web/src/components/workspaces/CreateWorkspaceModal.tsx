import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; description?: string; color: string }) => void;
}

const PRESET_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4'];

/** Closes #831: Create workspace dialog */
export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate({ name: name.trim(), description: description.trim(), color });
      setName('');
      setDescription('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center space-x-2 text-white">
            <FolderPlus size={20} className="text-emerald-400" />
            <h3 className="text-base font-semibold">Create Workspace</h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Workspace Name</label>
            <input
              type="text"
              placeholder="e.g. Acme Corp Internships"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full bg-gray-800 text-sm text-white px-3 py-2 rounded-xl border border-gray-700 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Internal product links, daily reporting, staging servers"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-800 text-xs text-white px-3 py-2 rounded-xl border border-gray-700 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Brand Theme Color
            </label>
            <div className="flex items-center space-x-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full border-2 transition ${color === c ? 'border-white scale-110' : 'border-transparent opacity-80'}`}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium rounded-xl transition"
            >
              Create Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
