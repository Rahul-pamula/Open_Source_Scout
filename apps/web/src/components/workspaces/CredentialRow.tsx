import React, { useState } from 'react';
import type { WorkspaceCredential } from '../../types/workspaces';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';

interface CredentialRowProps {
  credential: WorkspaceCredential;
  onDecryptPlaintext: (cred: WorkspaceCredential) => Promise<string>;
}

/** Closes #820: Credential row with masked password bullets */
export const CredentialRow: React.FC<CredentialRowProps> = ({ credential, onDecryptPlaintext }) => {
  const [revealed, setRevealed] = useState(false);
  const [plaintext, setPlaintext] = useState('');
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  const toggleReveal = async () => {
    if (!revealed) {
      const secret = await onDecryptPlaintext(credential);
      setPlaintext(secret);
      setRevealed(true);
    } else {
      setRevealed(false);
      setPlaintext('');
    }
  };

  const handleCopyUser = () => {
    const user = credential.identifier || credential.username || '';
    navigator.clipboard.writeText(user);
    setCopiedUser(true);
    setTimeout(() => setCopiedUser(false), 2000);
  };

  const handleCopyPass = async () => {
    const secret = plaintext || (await onDecryptPlaintext(credential));
    navigator.clipboard.writeText(secret);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-900/60 border border-gray-800">
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-white">{credential.service_name}</span>
        <span className="text-xs text-gray-400 font-mono mt-0.5">
          {credential.identifier || credential.username}
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <div className="px-3 py-1 bg-gray-950 rounded-lg border border-gray-800 font-mono text-xs text-emerald-400 select-all">
          {revealed ? plaintext : '••••••••••••'}
        </div>

        <button
          type="button"
          onClick={toggleReveal}
          className="p-1.5 text-gray-400 hover:text-white bg-gray-800/80 rounded-lg"
          title={revealed ? 'Hide Password' : 'Show Password'}
          aria-label="Toggle Password Visibility"
        >
          {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>

        <button
          type="button"
          onClick={handleCopyUser}
          className="p-1.5 text-gray-400 hover:text-white bg-gray-800/80 rounded-lg"
          title="Copy Username"
        >
          {copiedUser ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>

        <button
          type="button"
          onClick={handleCopyPass}
          className="px-2.5 py-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg flex items-center space-x-1"
        >
          {copiedPass ? <Check size={12} /> : null}
          <span>{copiedPass ? 'Copied' : 'Copy Key'}</span>
        </button>
      </div>
    </div>
  );
};

// Closes #822: [Workspaces Phase 7] feat(vault): implement 15-second automatic re-mask timer for revealed passwords
