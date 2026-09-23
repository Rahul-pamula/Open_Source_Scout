import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Terminal, Database, Layers, GitBranch, Shield, Workflow, Cpu, Code2 } from 'lucide-react';
import { hasSupabaseConfig } from '../services/supabase';

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center selection:bg-emerald-200">
      {/* Decorative background pattern */}
      <div
        className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Navigation */}
      <nav className="w-full max-w-6xl mx-auto px-6 py-6 flex justify-between items-center relative z-10">
        <div className="font-black text-xl tracking-tighter flex items-center gap-2">
          <div className="bg-zinc-900 text-white p-1.5 rounded-sm">
            <Terminal size={18} strokeWidth={3} />
          </div>
          Scout 2.0
        </div>
        <div className="flex gap-6 font-mono text-sm items-center">
          <Link to="/docs" className="text-zinc-500 hover:text-zinc-900 transition-colors">
            Documentation
          </Link>
          <a
            href="https://github.com/Rahul-pamula/Open_Source_Scout"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            GitHub
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-4xl w-full px-6 pt-32 pb-24 text-center relative z-10">
        <h1 className="text-5xl md:text-7xl font-black text-zinc-900 tracking-tight leading-[1.1] mb-6">
          Find the issues worth solving. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-500 to-zinc-300">
            Contribute with confidence.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-zinc-600 mb-12 font-medium max-w-2xl mx-auto leading-relaxed">
          Scout 2.0 is an AI-assisted workflow that helps you discover, understand, claim, and
          manage open-source contributions. Your backend. Your GitHub. Your data.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('/setup')}
            className="w-full sm:w-auto bg-zinc-900 text-white font-bold py-3.5 px-8 border-2 border-zinc-900 shadow-[4px_4px_0px_#27272a] hover:-translate-y-px hover:shadow-[5px_5px_0px_#27272a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center rounded-sm"
          >
            Start with Scout 2.0 <span className="ml-2">→</span>
          </button>
          <button
            onClick={() => navigate('/mcp-setup')}
            className="w-full sm:w-auto bg-white text-zinc-900 font-bold py-3.5 px-8 border-2 border-zinc-200 shadow-[4px_4px_0px_#e4e4e7] hover:-translate-y-px hover:shadow-[5px_5px_0px_#e4e4e7] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center rounded-sm"
          >
            Connect MCP <Terminal className="ml-2 h-4 w-4 text-zinc-400" />
          </button>
        </div>
        <div className="mt-6 font-mono text-xs text-zinc-400">
          Use the hosted interface. Bring your own backend.
        </div>
      </div>

      {/* Value Prop 1: Pipeline */}
      <div className="max-w-6xl w-full px-6 mb-24 relative z-10">
        <div className="bg-white border border-zinc-200 shadow-xl p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-4">
                Stop the Scroll of Despair.
              </h2>
              <p className="text-zinc-600 leading-relaxed mb-6">
                Developers waste hours scrolling through irrelevant GitHub issues, guessing
                difficulty, and checking if issues are already claimed. Scout 2.0 replaces this
                friction with a focused Mission Control pipeline.
              </p>
              <div className="flex flex-col gap-3 font-mono text-sm text-zinc-600">
                <div className="flex items-center gap-3">
                  <span className="text-emerald-500">→</span> Discovery
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-500">→</span> AI Dossier (Match Score & Difficulty)
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-500">→</span> Claim & Assignment
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-500">→</span> Contribution Tracking
                </div>
              </div>
            </div>
            <div className="bg-zinc-50 border border-zinc-100 p-6 font-mono text-xs text-zinc-500 leading-loose rounded">
              <div className="text-zinc-900 font-bold mb-4">// The AI Dossier</div>
              <div>[INFO] Analyzing issue context...</div>
              <div>[MATCH] Skills aligned with React, TypeScript.</div>
              <div>[DIFF] Estimated difficulty: Intermediate.</div>
              <div>[STATUS] No competing claims detected.</div>
              <div className="text-emerald-600 mt-4 font-bold">READY FOR ENGAGEMENT</div>
            </div>
          </div>
        </div>
      </div>

      {/* NEW SECTION: The AI Execution Harness (MCP) */}
      <div className="max-w-6xl w-full px-6 mb-24 relative z-10">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1 bg-zinc-900 p-6 font-mono text-xs text-zinc-400 leading-loose rounded shadow-xl border border-zinc-800">
            <div className="text-zinc-500 mb-4">// Scout v2 MCP Harness</div>
            <div>
              <span className="text-blue-400">Developer</span> → Triggers execution in IDE
            </div>
            <div>
              <span className="text-purple-400">AI Agent</span> → Plans the implementation
            </div>
            <div>
              <span className="text-emerald-400">Scout MCP</span> → Orchestrates safely:
            </div>
            <div className="pl-4">↳ Spins up isolated git worktree</div>
            <div className="pl-4">↳ Spawns managed shell process</div>
            <div className="pl-4">↳ Enforces strictly bound I/O</div>
            <div className="pl-4">↳ Detects dropped heartbeats</div>
            <div>
              <span className="text-zinc-300">Result</span> → Code executed. Zero host damage.
            </div>
          </div>
          <div className="order-1 md:order-2">
            <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-6">
              Safe, Local-First AI Execution.
            </h2>
            <p className="text-zinc-600 leading-relaxed mb-6">
              Giving an AI direct shell access to your computer is dangerous and chaotic. Scout 2.0
              introduces a strict <strong>Model Context Protocol (MCP) Harness</strong> that acts as
              a secure layer between your IDE and your filesystem.
            </p>
            <div className="flex flex-col gap-4 font-mono text-sm text-zinc-600">
              <div className="flex items-center gap-3">
                <Shield className="text-emerald-500 h-5 w-5" /> Enforced Path Boundaries
              </div>
              <div className="flex items-center gap-3">
                <GitBranch className="text-emerald-500 h-5 w-5" /> Isolated Git Worktrees
              </div>
              <div className="flex items-center gap-3">
                <Cpu className="text-emerald-500 h-5 w-5" /> Zombie Process Prevention
              </div>
              <div className="flex items-center gap-3">
                <Workflow className="text-emerald-500 h-5 w-5" /> Stale Session Heartbeats
              </div>
            </div>

            <div className="mt-8 border-t border-zinc-200 pt-6">
              <h3 className="font-bold text-zinc-900 mb-2">Connect in seconds:</h3>
              <p className="text-sm text-zinc-500 mb-3">
                Add this to your Cursor or Claude Desktop config to sync your local IDE with your
                Supabase backend.
              </p>
              <div className="bg-zinc-900 p-3 font-mono text-xs text-zinc-300 rounded border border-zinc-800 overflow-x-auto">
                <pre>
                  {`"scout-v2": {
  "command": "npx",
  "args": ["-y", "@scout/mcp"]
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BYOB Architecture */}
      <div className="bg-zinc-900 w-full py-24 mb-24 relative z-10">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight mb-4">
              100% Decentralized.
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-6">
              Scout 2.0 doesn't route your data through a shared server. You own the backend, the
              API keys, and the GitHub connection. The hosted frontend connects directly to your
              personal infrastructure.
            </p>
            <div className="flex flex-col gap-4 mt-8">
              <div className="flex gap-4 items-start">
                <Database className="text-emerald-400 mt-1 shrink-0" size={20} />
                <div>
                  <div className="text-white font-bold">Your Supabase</div>
                  <div className="text-zinc-500 text-sm">
                    State, configuration, and rate limits.
                  </div>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <Layers className="text-blue-400 mt-1 shrink-0" />
                <div>
                  <div className="text-white font-bold">Your Edge Functions</div>
                  <div className="text-zinc-500 text-sm">
                    Secure execution and GitHub integration.
                  </div>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <Terminal className="text-zinc-400 mt-1 shrink-0" />
                <div>
                  <div className="text-white font-bold">Your API Keys</div>
                  <div className="text-zinc-500 text-sm">
                    Groq and GitHub keys stay in your vault.
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-black/50 border border-zinc-800 p-8 font-mono text-sm text-zinc-300 rounded">
            <div className="text-zinc-500 mb-4">// Architecture Flow</div>
            <div className="flex items-center justify-between mb-2">
              <span>Your Browser / MCP</span>
              <span className="text-zinc-600">----→</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="ml-4 text-emerald-400">Your Supabase DB</span>
              <span className="text-zinc-600">----→</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="ml-8 text-blue-400">Your Edge Functions</span>
              <span className="text-zinc-600">----→</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="ml-12 text-zinc-100">GitHub & Groq APIs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Setup Reality */}
      <div className="max-w-6xl w-full px-6 mb-24 relative z-10 text-center">
        <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-4">
          Setup takes a few minutes.
        </h2>
        <p className="text-zinc-600 leading-relaxed max-w-2xl mx-auto mb-12">
          Because the infrastructure belongs to you, Scout 2.0 requires several credentials. We
          don't hide the complexity, we structure it into a clear onboarding journey.
        </p>

        <div className="grid md:grid-cols-3 gap-6 text-left">
          <div className="bg-white border border-zinc-200 p-6 shadow-sm">
            <h3 className="font-bold text-zinc-900 mb-2">1. Get your keys</h3>
            <p className="text-sm text-zinc-600 mb-4">
              Create a free Supabase project, generate a GitHub OAuth App, and grab a Groq API key.
            </p>
          </div>
          <div className="bg-white border border-zinc-200 p-6 shadow-sm">
            <h3 className="font-bold text-zinc-900 mb-2">2. Run the CLI</h3>
            <div className="bg-zinc-100 p-2 font-mono text-xs rounded mb-4 border border-zinc-200">
              npx open-source-scout setup
            </div>
            <p className="text-sm text-zinc-600">
              The CLI securely deploys the database schema and edge functions to your Supabase
              project.
            </p>
          </div>
          <div className="bg-white border border-zinc-200 p-6 shadow-sm">
            <h3 className="font-bold text-zinc-900 mb-2">3. Connect</h3>
            <p className="text-sm text-zinc-600 mb-4">
              Open the hosted frontend, paste your Supabase connection URL, and sign in.
            </p>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="w-full bg-white border-t border-zinc-200 py-20 text-center relative z-10">
        <h2 className="text-4xl font-black text-zinc-900 tracking-tight mb-8">
          Stop scrolling. Start contributing.
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('/setup')}
            className="w-full sm:w-auto bg-zinc-900 text-white font-bold py-3.5 px-10 border-2 border-zinc-900 shadow-[4px_4px_0px_#27272a] hover:-translate-y-px hover:shadow-[5px_5px_0px_#27272a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center rounded-sm"
          >
            Start with Scout 2.0
          </button>
          <a
            href="https://github.com/Rahul-pamula/Open_Source_Scout"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto bg-white text-zinc-900 font-bold py-3.5 px-10 border-2 border-zinc-200 shadow-[4px_4px_0px_#e4e4e7] hover:-translate-y-px hover:shadow-[5px_5px_0px_#e4e4e7] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center rounded-sm"
          >
            <GitBranch className="mr-2 h-5 w-5" />
            View on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
