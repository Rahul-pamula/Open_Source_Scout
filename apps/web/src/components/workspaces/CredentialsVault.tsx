import React, { useState } from 'react';
import type { WorkspaceCredential } from '../../types/workspaces';
import { Lock, ChevronDown, ChevronRight, Plus, ShieldCheck } from 'lucide-react';

interface CredentialsVaultProps {
  credentials: WorkspaceCredential[];
  onAddCredential?: () => void;
  onCopyPassword?: (cred: WorkspaceCredential) => void;
  onCopyUsername?: (cred: WorkspaceCredential) => void;
}

/** Closes #818: Collapsible Credentials Vault drawer */
export const CredentialsVault: React.FC<CredentialsVaultProps> = ({
  credentials,
  onAddCredential,
  onCopyPassword,
  onCopyUsername,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-8 border border-gray-800/80 rounded-2xl bg-gray-950/60 overflow-hidden shadow-xl">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-900/40 transition select-none"
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Lock size={16} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-semibold text-white">Access & Credentials Vault</h4>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center space-x-1">
                <ShieldCheck size={10} />
                <span>AES-256 Client-Side</span>
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Check credentials (Optional)</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {isOpen && onAddCredential && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddCredential();
              }}
              className="inline-flex items-center space-x-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition"
            >
              <Plus size={14} />
              <span>Add Credential</span>
            </button>
          )}
          <span className="text-gray-400">
            {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </span>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 border-t border-gray-800/80 bg-gray-900/20 space-y-2">
          {credentials.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">
              No credentials stored for this workspace.
            </p>
          ) : (
            credentials.map((cred) => (
              <div
                key={cred.id}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-900/60 border border-gray-800"
              >
                <div>
                  <span className="text-xs font-semibold text-white">{cred.service_name}</span>
                  <span className="text-xs text-gray-400 ml-2 font-mono">
                    ({cred.identifier || cred.username})
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {onCopyUsername && (
                    <button
                      type="button"
                      onClick={() => onCopyUsername(cred)}
                      className="px-2.5 py-1 text-xs text-gray-300 hover:text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition"
                    >
                      Copy User
                    </button>
                  )}
                  {onCopyPassword && (
                    <button
                      type="button"
                      onClick={() => onCopyPassword(cred)}
                      className="px-2.5 py-1 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition"
                    >
                      Copy Password
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
