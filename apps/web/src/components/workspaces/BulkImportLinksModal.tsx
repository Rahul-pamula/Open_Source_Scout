import React, { useState } from 'react';
import { X, UploadCloud } from 'lucide-react';
import { extractDomain, normalizeUrl } from '../../utils/faviconResolver';

interface BulkImportLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (links: Array<{ title: string; url: string; section_name: string }>) => void;
}

/** Closes #813: Bulk import links by pasting lines of URLs */
export const BulkImportLinksModal: React.FC<BulkImportLinksModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [text, setText] = useState('');
  const [section, setSection] = useState('Imported Links');

  if (!isOpen) return null;

  const handleImport = () => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed = lines.map((line) => {
      const parts = line.split(/[\s,|]+/);
      const rawUrl = parts.find((p) => p.includes('.')) || line;
      const domain = extractDomain(rawUrl) || rawUrl;
      return {
        title: domain.charAt(0).toUpperCase() + domain.slice(1),
        url: normalizeUrl(rawUrl),
        section_name: section,
      };
    });

    onImport(parsed);
    setText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center space-x-2 text-white">
            <UploadCloud size={20} className="text-emerald-400" />
            <h3 className="text-base font-semibold">Bulk Import Links</h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-xs text-gray-400">
            Paste one URL per line. Titles will be auto-generated from domains.
          </p>
          <textarea
            rows={6}
            placeholder="https://docs.google.com/document/d/...\nhttps://app.clickup.com\nhttps://github.com/my-org/repo"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full bg-gray-800 text-xs text-white p-3 rounded-xl border border-gray-700 font-mono focus:border-emerald-500 focus:outline-none"
          />
          <div className="flex items-center space-x-2">
            <label className="text-xs text-gray-300">Assign to Section:</label>
            <input
              type="text"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="bg-gray-800 text-xs text-white px-2 py-1 rounded-lg border border-gray-700"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-gray-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!text.trim()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium rounded-xl transition"
          >
            Import Links
          </button>
        </div>
      </div>
    </div>
  );
};
