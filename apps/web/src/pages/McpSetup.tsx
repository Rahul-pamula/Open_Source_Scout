import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Terminal, Check, Copy, HelpCircle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

export default function SetupPage() {
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showPromptHelper, setShowPromptHelper] = useState(false);

  const mcpCommand = 'npx';
  const mcpArgs = ['-y', 'open-source-scout-mcp'];

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

  const llmPrompt = `I want to set up an MCP (Model Context Protocol) server called "Scout" in my AI coding assistant / IDE.

Here is the MCP configuration I need to add:

\`\`\`json
${snippet}
\`\`\`

Please help me:
1. Identify where the MCP configuration file is located in my IDE.
2. How to add the above JSON correctly (merge it, don't replace existing servers).
3. How to restart or reload the MCP servers after saving.

I am using [REPLACE WITH YOUR IDE — e.g. Cursor, VS Code + Cline, Claude Desktop, Windsurf, etc.]`;

  const handleCopy = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Universal Header */}
      <header className="w-full bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between mb-8 shadow-sm">
        <Link
          to="/"
          className="flex items-center gap-2 font-black text-lg text-zinc-900 tracking-tight hover:opacity-80 transition-opacity"
        >
          <img
            src={`${import.meta.env.BASE_URL}logo.jpg`}
            alt="Logo"
            className="w-7 h-7 rounded shadow-sm"
          />
          Open Source Scout
        </Link>
        <Link
          to="/docs"
          className="text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          Documentation
        </Link>
      </header>

      <div className="max-w-4xl w-full mx-auto px-4 pb-12">
        <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">MCP Setup</h1>
        <p className="text-zinc-600 mb-8 text-sm">
          Integrate Scout with your IDE via the Model Context Protocol (MCP). Works with Cursor,
          Cline, Claude Desktop, Windsurf, and any MCP-compatible assistant.
        </p>

        <div className="space-y-6">
          {/* Step 1: Config snippet */}
          <section className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-zinc-50 border-b border-zinc-200 px-6 py-4">
              <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Terminal size={18} className="text-zinc-500" />
                Universal Configuration
              </h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-zinc-700 mb-4">
                Add this JSON snippet to your AI assistant's MCP configuration file.
              </p>
              <div className="relative group">
                <pre className="bg-zinc-950 text-emerald-400 p-4 rounded-md text-sm font-mono overflow-x-auto whitespace-pre border border-zinc-800">
                  {snippet}
                </pre>
                <button
                  onClick={() => handleCopy(snippet, setCopiedSnippet)}
                  className="absolute top-2 right-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded transition-colors"
                  title="Copy snippet"
                >
                  {copiedSnippet ? (
                    <Check size={16} className="text-emerald-400" />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* Step 2: LLM Prompt Helper */}
          <section className="border border-amber-200 bg-amber-50 rounded-lg overflow-hidden shadow-sm">
            <button
              className="w-full flex items-center justify-between px-6 py-4 text-left"
              onClick={() => setShowPromptHelper((v) => !v)}
            >
              <div className="flex items-center gap-3">
                <HelpCircle size={18} className="text-amber-500 flex-shrink-0" />
                <div>
                  <p className="font-bold text-zinc-900 text-sm">
                    Don't know how to set up MCP in your IDE?
                  </p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    No worries — copy this prompt and paste it into ChatGPT, Claude, or any LLM.
                  </p>
                </div>
              </div>
              {showPromptHelper ? (
                <ChevronUp size={18} className="text-zinc-500 flex-shrink-0" />
              ) : (
                <ChevronDown size={18} className="text-zinc-500 flex-shrink-0" />
              )}
            </button>

            {showPromptHelper && (
              <div className="border-t border-amber-200 p-6 bg-white">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={15} className="text-emerald-500" />
                  <p className="text-sm font-semibold text-zinc-800">
                    Give this prompt to any LLM (ChatGPT, Claude, Gemini, etc.)
                  </p>
                </div>
                <p className="text-xs text-zinc-500 mb-3">
                  Replace{' '}
                  <code className="bg-zinc-100 px-1 py-0.5 rounded">[REPLACE WITH YOUR IDE]</code>{' '}
                  with the name of your editor before sending.
                </p>
                <div className="relative">
                  <pre className="bg-zinc-950 text-zinc-200 p-4 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap border border-zinc-800 leading-relaxed">
                    {llmPrompt}
                  </pre>
                  <button
                    onClick={() => handleCopy(llmPrompt, setCopiedPrompt)}
                    className="absolute top-2 right-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    {copiedPrompt ? (
                      <>
                        <Check size={13} className="text-emerald-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        Copy Prompt
                      </>
                    )}
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <p className="text-xs text-zinc-500 w-full">Then paste it into:</p>
                  {['ChatGPT', 'Claude', 'Gemini', 'Perplexity', "Your IDE's own AI chat"].map(
                    (llm) => (
                      <span
                        key={llm}
                        className="text-xs bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-full border border-zinc-200"
                      >
                        {llm}
                      </span>
                    ),
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
