import React, { useState } from 'react';
import type { WorkspaceLink } from '../../types/workspaces';
import { X } from 'lucide-react';
import { normalizeUrl } from '../../utils/faviconResolver';

interface EditLinkModalProps {
  isOpen: boolean;
  link: WorkspaceLink | null;
  sections?: string[];
  onClose: () => void;
  onSave: (updated: Partial<WorkspaceLink> & { id: string }) => void;
}

/** Closes #811: Edit Link modal */
export const EditLinkModal: React.FC<EditLinkModalProps> = ({
  isOpen,
  link,
  sections = ['General'],
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(link?.title || '');
  const [url, setUrl] = useState(link?.url || '');
  const [section, setSection] = useState(link?.section_name || 'General');

  if (!isOpen || !link) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: link.id,
      title: title.trim(),
      url: normalizeUrl(url),
      section_name: section,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <h3 className="text-base font-semibold text-white">Edit Link</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-800 text-sm text-white px-3 py-2 rounded-xl border border-gray-700 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-gray-800 text-sm text-white px-3 py-2 rounded-xl border border-gray-700 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Section</label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full bg-gray-800 text-sm text-white px-3 py-2 rounded-xl border border-gray-700 focus:border-emerald-500 focus:outline-none"
            >
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
