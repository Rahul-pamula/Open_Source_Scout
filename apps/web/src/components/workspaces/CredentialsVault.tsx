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
    <div className="mt-8 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm transition-all">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition select-none"
      >
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
            <Lock size={16} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                Access & Credentials Vault
              </h4>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center space-x-1 font-semibold">
                <ShieldCheck size={10} />
                <span>AES-256 Client-Side</span>
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Check credentials (Optional - Click to reveal encrypted logins)
            </p>
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
              className="inline-flex items-center space-x-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition shadow-xs"
            >
              <Plus size={14} />
              <span>Add Credential</span>
            </button>
          )}
          <span className="text-zinc-400 dark:text-zinc-500">
            {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </span>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 space-y-2">
          {credentials.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-4">
              No credentials stored for this workspace.
            </p>
          ) : (
            credentials.map((cred) => (
              <div
                key={cred.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs"
              >
                <div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                    {cred.service_name}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-2 font-mono">
                    ({cred.identifier || cred.username})
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {onCopyUsername && (
                    <button
                      type="button"
                      onClick={() => onCopyUsername(cred)}
                      className="px-2.5 py-1 text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                    >
                      Copy User
                    </button>
                  )}
                  {onCopyPassword && (
                    <button
                      type="button"
                      onClick={() => onCopyPassword(cred)}
                      className="px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition font-medium"
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
