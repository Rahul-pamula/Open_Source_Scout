import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabaseConfig } from '../services/supabase';
import { Terminal, Check, Copy } from 'lucide-react';

export default function SetupPage() {
  const { session } = useAuth();
  const config = getSupabaseConfig();

  const [copiedAntigravity, setCopiedAntigravity] = useState(false);
  const [copiedCursor, setCopiedCursor] = useState(false);

  const mcpCommand = 'npx';
  const mcpArgs = ['-y', '@scout/mcp'];

  const snippet = JSON.stringify(
    {
      mcpServers: {
        scout: {
          command: mcpCommand,
          args: mcpArgs,
        },
      },
    },
    null,
    2,
  );

  const handleCopy = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 font-sans">
      <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">MCP Setup</h1>
      <p className="text-zinc-600 mb-8 text-sm">
        Integrate Scout with your IDE via the Model Context Protocol (MCP).
      </p>

      <div className="space-y-8">
        <section className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
          <div className="bg-zinc-50 border-b border-zinc-200 px-6 py-4">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <Terminal size={18} className="text-zinc-500" />
              Universal Configuration
            </h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-zinc-700 mb-4">
              Add this JSON snippet to your AI assistant's MCP configuration file (e.g., Cursor,
              Cline, Claude Desktop, Antigravity, etc.).
            </p>
            <div className="relative group">
              <pre className="bg-zinc-950 text-emerald-400 p-4 rounded-md text-sm font-mono overflow-x-auto whitespace-pre border border-zinc-800">
                {snippet}
              </pre>
              <button
                onClick={() => handleCopy(snippet, setCopiedAntigravity)}
                className="absolute top-2 right-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded transition-colors"
                title="Copy snippet"
              >
                {copiedAntigravity ? (
                  <Check size={16} className="text-emerald-400" />
                ) : (
                  <Copy size={16} />
                )}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
