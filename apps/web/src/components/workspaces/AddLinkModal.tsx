import React, { useState, useEffect } from 'react';
import { X, Globe } from 'lucide-react';
import { extractDomain, getGoogleS2FaviconUrl, normalizeUrl } from '../../utils/faviconResolver';

interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (linkData: {
    title: string;
    url: string;
    section_name: string;
    icon_url?: string;
  }) => void;
  sections?: string[];
}

/** Closes #808: Add Link Modal with live icon preview */
export const AddLinkModal: React.FC<AddLinkModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  sections = ['General'],
}) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [section, setSection] = useState(sections[0] || 'General');
  const [iconPreview, setIconPreview] = useState<string | null>(null);

  useEffect(() => {
    if (url.trim()) {
      const domain = extractDomain(url);
      if (domain) {
        if (!title) {
          const capitalized = domain.split('.')[0];
          setTitle(capitalized.charAt(0).toUpperCase() + capitalized.slice(1));
        }
        setIconPreview(getGoogleS2FaviconUrl(domain, 128));
      } else {
        setIconPreview(null);
      }
    } else {
      setIconPreview(null);
    }
  }, [url]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && title.trim()) {
      onAdd({
        title: title.trim(),
        url: normalizeUrl(url),
        section_name: section,
        icon_url: iconPreview || undefined,
      });
      setUrl('');
      setTitle('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden p-6">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <h3 className="text-base font-bold text-zinc-900">Add Link to Workspace</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">URL</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="e.g. docs.google.com or https://github.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
                className="w-full bg-zinc-50 text-sm text-zinc-900 px-3 py-2 rounded-xl border border-zinc-300 focus:border-emerald-500 focus:outline-hidden"
              />
              <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                {iconPreview ? (
                  <img src={iconPreview} alt="Preview" className="w-6 h-6 object-contain" />
                ) : (
                  <Globe size={18} className="text-zinc-400" />
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Title</label>
            <input
              type="text"
              placeholder="e.g. Engineering Onboarding Doc"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-50 text-sm text-zinc-900 px-3 py-2 rounded-xl border border-zinc-300 focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Section</label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full bg-zinc-50 text-sm text-zinc-900 px-3 py-2 rounded-xl border border-zinc-300 focus:border-emerald-500 focus:outline-hidden"
            >
              <option value="__new__">+ Create new section...</option>
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
              className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!url.trim() || !title.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              Add Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
