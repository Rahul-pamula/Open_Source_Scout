import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Server, GitBranch, Database } from 'lucide-react';
import { setSupabaseConfig, hasSupabaseConfig } from '../services/supabase';

export function Connect() {
  const { signInWithGithub } = useAuth();

  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const isConfigured = hasSupabaseConfig();

  const handleConnect = () => {
    const trimmedUrl = url.trim();
    const trimmedKey = key.trim();

    if (!trimmedUrl || !trimmedKey) return alert('Please provide both URL and Key.');

    setSupabaseConfig(trimmedUrl, trimmedKey);
    // Reload to re-initialize the singleton supabase client and React contexts
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full">
        <div className="mb-8 text-center">
          <Server className="h-12 w-12 text-zinc-900 mx-auto mb-4" />
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Connect Backend</h1>
          <p className="text-zinc-600 mt-2">Link your decentralized infrastructure.</p>
        </div>

        {!isConfigured ? (
          <div className="bg-white border border-zinc-200 p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="font-bold text-zinc-900 flex items-center mb-1">
                <Database size={16} className="mr-2 text-emerald-600" />
                Supabase Connection
              </h3>
              <p className="text-xs text-zinc-500">
                These are your public routing keys. They are safely stored in your browser's
                localStorage.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-1">Project URL</label>
                <input
                  type="text"
                  className="w-full border border-zinc-200 rounded p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                  placeholder="https://xyz.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-1">
                  Anon Key (Public)
                </label>
                <input
                  type="password"
                  className="w-full border border-zinc-200 rounded p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR..."
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                />
              </div>
              <button
                onClick={handleConnect}
                className="w-full bg-zinc-900 text-white font-bold py-2.5 px-4 border border-zinc-900 shadow-[3px_3px_0px_#27272a] hover:-translate-y-px hover:shadow-[4px_4px_0px_#27272a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all mt-4"
              >
                Connect to Database
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 p-6 shadow-sm text-center">
            <div className="inline-flex bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold mb-6 items-center">
              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
              Connected to Personal Backend
            </div>

            <button
              onClick={signInWithGithub}
              className="w-full flex items-center justify-center bg-[#24292F] text-white font-bold py-3 px-4 rounded hover:bg-[#24292F]/90 transition-colors"
            >
              <GitBranch className="mr-2 h-5 w-5" />
              Sign in with GitHub
            </button>

            <p className="text-xs text-zinc-500 mt-4">
              This will authenticate directly with your Supabase instance using strict Row Level
              Security.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
