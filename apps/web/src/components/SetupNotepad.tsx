import { useState } from 'react';
import { ClipboardList, Copy, Check } from 'lucide-react';

export function SetupNotepad() {
  const [keys, setKeys] = useState({
    projectId: '',
    anonKey: '',
    dbPassword: '',
    accessToken: '',
    groqKey: '',
    githubPat: '',
  });

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (key: keyof typeof keys, value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const updateKey = (key: keyof typeof keys, value: string) => {
    setKeys((prev) => ({ ...prev, [key]: value }));
  };

  const renderKeyInput = (id: keyof typeof keys, label: string, placeholder: string) => (
    <div className="flex flex-col mb-4 last:mb-0 group">
      <label className="text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <div className="flex bg-white/5 border border-white/10 rounded-lg overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] focus-within:border-emerald-500/50 focus-within:bg-white/10 transition-all duration-300">
        <input
          type="text"
          value={keys[id]}
          onChange={(e) => updateKey(id, e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-4 py-2.5 text-sm font-mono text-zinc-100 placeholder-zinc-500 bg-transparent outline-none"
        />
        <button
          onClick={() => handleCopy(id, keys[id])}
          disabled={!keys[id]}
          className="px-4 border-l border-white/10 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:bg-transparent transition-all flex items-center justify-center min-w-[52px]"
          title="Copy to clipboard"
        >
          {copiedField === id ? (
            <Check
              size={18}
              className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"
            />
          ) : (
            <Copy size={18} />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="sticky top-12 backdrop-blur-xl bg-zinc-950/80 border border-zinc-800 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden ring-1 ring-white/5 relative">
      {/* Decorative gradient blur */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-[64px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-[64px] pointer-events-none" />

      <div className="relative z-10">
        <div className="px-6 py-5 border-b border-white/5 flex items-center gap-3">
          <div className="bg-emerald-500/20 p-2 rounded-lg">
            <ClipboardList size={20} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="font-bold text-zinc-100 text-lg">Key Scratchpad</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Keep your keys handy during setup</p>
          </div>
        </div>

        <div className="p-4 bg-amber-500/10 border-b border-amber-500/20">
          <p className="text-xs text-amber-200/90 leading-relaxed font-medium">
            <span className="text-amber-400 font-bold mr-1">⚠️ Warning:</span>
            Keys are NOT saved to any database. They will be permanently lost if you refresh this
            page.
          </p>
        </div>

        <div className="p-6">
          {renderKeyInput('projectId', 'Supabase Project ID', 'e.g. abcdefghijklmnopqrst')}
          {renderKeyInput('anonKey', 'Supabase Anon Key', 'eyJ...')}
          {renderKeyInput('dbPassword', 'Database Password', 'Your secure password...')}
          {renderKeyInput('accessToken', 'Supabase Access Token', 'sbp_...')}
          {renderKeyInput('groqKey', 'Groq API Key', 'gsk_...')}
          {renderKeyInput('githubPat', 'GitHub PAT', 'github_pat_...')}
        </div>
      </div>
    </div>
  );
}
