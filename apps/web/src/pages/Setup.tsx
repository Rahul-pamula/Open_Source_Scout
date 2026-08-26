import { Link } from 'react-router-dom';
import { Terminal, Key, Database, ShieldCheck, ArrowRight, ClipboardList, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export function Setup() {
  const [keys, setKeys] = useState({
    projectId: '',
    accessToken: '',
    groqKey: '',
    githubPat: '',
    supabaseUrl: '',
    anonKey: ''
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (key: keyof typeof keys, value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const updateKey = (key: keyof typeof keys, value: string) => {
    setKeys(prev => ({ ...prev, [key]: value }));
  };

  const renderKeyInput = (id: keyof typeof keys, label: string, placeholder: string) => (
    <div className="flex flex-col mb-3">
      <label className="text-xs font-bold text-zinc-700 mb-1">{label}</label>
      <div className="flex bg-white border border-zinc-300 rounded overflow-hidden shadow-sm focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
        <input 
          type="text" 
          value={keys[id]}
          onChange={(e) => updateKey(id, e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm font-mono text-zinc-900 outline-none"
        />
        <button 
          onClick={() => handleCopy(id, keys[id])}
          disabled={!keys[id]}
          className="px-3 bg-zinc-50 border-l border-zinc-300 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center w-12"
          title="Copy to clipboard"
        >
          {copiedField === id ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center py-12 px-4 font-sans">
      <div className="mb-10 text-center max-w-3xl">
        <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-4">Deploy Your Scout</h1>
        <p className="text-zinc-600 text-lg">
          Open Source Scout has zero central servers. Follow these steps to deploy your personal backend. Your keys never leave your machine.
        </p>
      </div>

      <div className="max-w-6xl w-full flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left Side: Setup Steps */}
        <div className="flex-1 space-y-6 w-full lg:max-w-3xl">
          {/* Step 1 */}
          <div className="bg-white border border-zinc-200 p-6 flex gap-4 shadow-sm rounded-lg">
            <div className="bg-emerald-100 p-3 h-fit rounded-full text-emerald-700">
              <Database size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">1. Create a Supabase Database</h3>
              <p className="text-sm text-zinc-600 mt-1 mb-3">Create a free PostgreSQL database to store your tracking boards and profiles.</p>
              <ol className="list-decimal pl-5 text-sm text-zinc-700 space-y-2">
                <li>Go to <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">supabase.com</a>, create an account, and start a new project.</li>
                <li>Go to <strong>Project Settings -&gt; API</strong>. Copy your <code>Project ID</code> (from the URL), <code>Project URL</code>, and <code>anon</code> public key into the Scratchpad.</li>
                <li>Go to <a href="https://supabase.com/dashboard/account/tokens" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Access Tokens</a>. Click <strong>Generate new token</strong>, give it a name, and copy the <strong>Supabase Access Token</strong> into the Scratchpad.</li>
              </ol>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white border border-zinc-200 p-6 flex gap-4 shadow-sm rounded-lg">
            <div className="bg-zinc-100 p-3 h-fit rounded-full text-zinc-900">
              <Key size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">2. Get your AI & GitHub Keys</h3>
              <p className="text-sm text-zinc-600 mt-1 mb-3">You will need two more keys to power the AI integrations and repository fetching.</p>
              <div className="space-y-4">
                <div>
                  <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold text-sm">Groq API Key</a>
                  <p className="text-xs text-zinc-500 mt-1">Used to evaluate issues. Click "Create API Key" in the Groq console.</p>
                </div>
                <div>
                  <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold text-sm">GitHub Fine-grained Personal Access Token</a>
                  <div className="text-xs text-zinc-500 mt-1">
                    <ol className="list-decimal pl-4 space-y-1 mt-1 mb-2">
                      <li>Click <strong>Generate new token</strong>.</li>
                      <li>Change the <strong>Expiration</strong> to <strong>1 year</strong> (or remember to update it when it expires).</li>
                      <li>Under <strong>Repository access</strong>, select <strong>All repositories</strong>.</li>
                      <li>Under <strong>Permissions</strong>, click <strong>+ Add permissions</strong>. Find <strong>Issues</strong> and <strong>Pull Requests</strong> and set them both to <strong>Read and Write</strong> <em>(Note: Metadata will automatically be set to Read-only)</em>.</li>
                    </ol>
                    <p className="text-xs italic text-zinc-400">If your GitHub token ever expires, simply generate a new one and run the CLI setup again to update your backend secrets.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 flex gap-4 text-white shadow-sm rounded-lg">
            <div className="bg-zinc-800 p-3 h-fit rounded-full text-emerald-400">
              <Terminal size={24} />
            </div>
            <div className="w-full">
              <h3 className="text-lg font-bold">3. Run the CLI Setup</h3>
              <p className="text-sm text-zinc-400 mt-1 mb-4">Run this command in your terminal. It will prompt you for the keys you collected, securely inject them into your Supabase Vault, and deploy the Edge Functions.</p>
              
              <div className="bg-black p-4 rounded text-sm font-mono text-emerald-400 border border-zinc-800 whitespace-pre overflow-x-auto">
                npx open-source-scout setup
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white border border-zinc-200 p-6 flex gap-4 shadow-sm rounded-lg">
            <div className="bg-purple-100 p-3 h-fit rounded-full text-purple-700">
              <ShieldCheck size={24} />
            </div>
            <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">4. Ready to Go!</h3>
                <p className="text-sm text-zinc-600 mt-1">Once the CLI finishes successfully, you are ready to connect to your personal backend.</p>
              </div>
              <Link 
                to="/connect" 
                className="whitespace-nowrap bg-zinc-900 text-white font-bold py-2 px-6 border border-zinc-900 shadow-[3px_3px_0px_#27272a] hover:-translate-y-px hover:shadow-[4px_4px_0px_#27272a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center rounded"
              >
                Go to Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Side: Key Scratchpad */}
        <div className="w-full lg:w-96 flex-shrink-0 sticky top-12">
          <div className="bg-white border border-zinc-200 shadow-xl rounded-xl overflow-hidden">
            <div className="bg-zinc-900 p-4 border-b border-zinc-800 text-white flex items-center">
              <ClipboardList size={18} className="mr-2 text-emerald-400" />
              <h2 className="font-bold">Key Scratchpad</h2>
            </div>
            <div className="p-4 bg-amber-50/50 border-b border-amber-100">
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Warning:</strong> Keys are NOT saved to any database. They will be permanently lost if you refresh this page. Use this to easily copy/paste keys into your terminal.
              </p>
            </div>
            <div className="p-4 bg-zinc-50">
              {renderKeyInput('projectId', 'Supabase Project ID', 'e.g. abcdefghijklmnopqrst')}
              {renderKeyInput('supabaseUrl', 'Supabase Project URL', 'https://...supabase.co')}
              {renderKeyInput('anonKey', 'Supabase Anon Key', 'eyJ...')}
              {renderKeyInput('accessToken', 'Supabase Access Token', 'sbp_...')}
              {renderKeyInput('groqKey', 'Groq API Key', 'gsk_...')}
              {renderKeyInput('githubPat', 'GitHub PAT', 'github_pat_...')}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
