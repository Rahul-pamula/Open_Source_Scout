import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface AddSectionButtonProps {
  onAddSection: (name: string) => void;
}

/** Closes #801: Quick creation trigger for custom app sections */
export const AddSectionButton: React.FC<AddSectionButtonProps> = ({ onAddSection }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAddSection(name.trim());
      setName('');
      setIsOpen(false);
    }
  };

  return isOpen ? (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2 px-4 py-2">
      <input
        type="text"
        placeholder="Section name (e.g. Daily Standup, Design Tools)..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        className="bg-gray-850 text-xs text-white px-3 py-1.5 rounded-lg border border-emerald-500/50 focus:outline-none focus:border-emerald-400 w-64"
      />
      <button
        type="submit"
        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => setIsOpen(false)}
        className="px-2 py-1.5 text-gray-400 hover:text-white text-xs"
      >
        Cancel
      </button>
    </form>
  ) : (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className="inline-flex items-center space-x-1.5 text-xs text-emerald-400/90 hover:text-emerald-300 font-medium px-4 py-2 hover:bg-emerald-500/10 rounded-lg transition"
    >
      <Plus size={14} />
      <span>Add Section</span>
    </button>
  );
};
