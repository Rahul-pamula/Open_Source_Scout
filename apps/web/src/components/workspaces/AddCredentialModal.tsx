import React, { useState } from 'react';
import { X, KeyRound, ShieldAlert } from 'lucide-react';

interface AddCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cred: { service_name: string; identifier: string; plaintextSecret: string }) => void;
}

/** Closes #825: Modal for adding new encrypted credentials */
export const AddCredentialModal: React.FC<AddCredentialModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [service, setService] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (service.trim() && identifier.trim() && password.trim()) {
      onSave({
        service_name: service.trim(),
        identifier: identifier.trim(),
        plaintextSecret: password.trim(),
      });
      setService('');
      setIdentifier('');
      setPassword('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center space-x-2 text-white">
            <KeyRound size={20} className="text-emerald-400" />
            <h3 className="text-base font-semibold">Store Encrypted Credential</h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Service / App Name
            </label>
            <input
              type="text"
              placeholder="e.g. HRMS Work Portal, ClickUp, Jira"
              value={service}
              onChange={(e) => setService(e.target.value)}
              autoFocus
              className="w-full bg-gray-800 text-sm text-white px-3 py-2 rounded-xl border border-gray-700 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Username / Identifier
            </label>
            <input
              type="text"
              placeholder="e.g. intern@company.com or employee_id"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-gray-800 text-sm text-white px-3 py-2 rounded-xl border border-gray-700 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Password / API Secret
            </label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-800 text-sm text-white px-3 py-2 rounded-xl border border-gray-700 focus:border-emerald-500 focus:outline-none font-mono"
            />
          </div>

          <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-start space-x-2 text-xs text-gray-400">
            <ShieldAlert size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Encrypted client-side with AES-256-GCM. Plaintext is never transmitted to the
              database.
            </span>
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
              disabled={!service.trim() || !identifier.trim() || !password.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium rounded-xl transition"
            >
              Encrypt & Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
