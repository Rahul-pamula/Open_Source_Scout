import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Terminal,
  Database,
  Layers,
  GitBranch,
  Shield,
  Workflow,
  Cpu,
  Code2,
  ArrowRight,
  Server,
  BrainCircuit,
  Search,
  Lock,
} from 'lucide-react';
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
          Scout
        </div>
        <div className="flex gap-6 font-mono text-sm items-center">
          <a href="#v1" className="text-zinc-500 hover:text-zinc-900 transition-colors">
            v1: Dashboard
          </a>
          <a href="#v2" className="text-zinc-500 hover:text-zinc-900 transition-colors">
            v2: MCP Orchestrator
          </a>
          <Link to="/docs" className="text-zinc-500 hover:text-zinc-900 transition-colors">
            Docs
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-4xl w-full px-6 pt-32 pb-24 text-center relative z-10">
        <h1 className="text-5xl md:text-7xl font-black text-zinc-900 tracking-tight leading-[1.1] mb-6">
          From Issue Discovery to <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-blue-600">
            Invisible AI Execution.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-zinc-600 mb-12 font-medium max-w-2xl mx-auto leading-relaxed">
          Scout started as a powerful cloud dashboard to find your next open-source contribution.
          Now, it has evolved into a secure, invisible local harness for your AI coding agents.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/setup"
            className="w-full sm:w-auto bg-zinc-900 text-white font-bold py-3.5 px-8 border-2 border-zinc-900 shadow-[4px_4px_0px_#27272a] hover:-translate-y-px hover:shadow-[5px_5px_0px_#27272a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center rounded-sm"
          >
            Start with Dashboard (v1)
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
          <Link
            to="/mcp-setup"
            className="w-full sm:w-auto bg-white text-zinc-900 font-bold py-3.5 px-8 border-2 border-zinc-200 shadow-[4px_4px_0px_#e4e4e7] hover:-translate-y-px hover:shadow-[5px_5px_0px_#e4e4e7] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center rounded-sm"
          >
            Connect MCP Harness (v2)
            <Server className="ml-2 h-5 w-5 text-zinc-400" />
          </Link>
        </div>
      </div>

      {/* =========================================
          PART 1: SCOUT V1.0 (THE CLOUD MONOLITH)
          ========================================= */}
      <div id="v1" className="max-w-6xl w-full px-6 mb-32 relative z-10">
        <div className="mb-12">
          <div className="inline-block px-3 py-1 mb-4 text-xs font-bold font-mono tracking-widest text-zinc-500 border border-zinc-200 rounded-full uppercase bg-white">
            Part 1: The Cloud Monolith
          </div>
          <h2 className="text-4xl font-black text-zinc-900 tracking-tight">Scout v1.0</h2>
        </div>

        <div className="bg-white border border-zinc-200 shadow-xl p-8 md:p-12 mb-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-4">
                The Open Source Contributor's Dilemma
              </h3>
              <p className="text-zinc-600 leading-relaxed mb-6">
                Manually hunting for open issues that match your skills is tedious. To solve this
                for the broader open-source community, Scout v1.0 was built as a centralized web
                dashboard to discover, claim, and track issues automatically.
              </p>
              <div className="flex flex-col gap-3 font-mono text-sm text-zinc-600">
                <div className="flex items-center gap-3">
                  <Search className="text-blue-500 h-5 w-5" /> Automated GitHub Discovery
                </div>
                <div className="flex items-center gap-3">
                  <Database className="text-blue-500 h-5 w-5" /> Supabase PostgreSQL Syncing
                </div>
                <div className="flex items-center gap-3">
                  <Layers className="text-blue-500 h-5 w-5" /> Serverless Edge Functions
                </div>
              </div>
            </div>
            <div className="bg-zinc-50 border border-zinc-100 p-6 font-mono text-xs text-zinc-500 leading-loose rounded">
              <div className="text-zinc-900 font-bold mb-4">// Event-Driven Architecture</div>
              <div>[GITHUB] Issue closed via Pull Request</div>
              <div>[WEBHOOK] Intercepted by Edge Function</div>
              <div>[SUPABASE] Database state synced instantly</div>
              <div>[DASHBOARD] UI updates automatically</div>
              <div className="text-blue-600 mt-4 font-bold">ZERO MANUAL DATA ENTRY</div>
            </div>
          </div>
        </div>

        <div className="text-center font-mono text-sm text-zinc-500 max-w-2xl mx-auto">
          Scout v1.0 successfully built an automated, event-driven cloud monolith that removed the
          manual data entry problem for open source contributors.
        </div>
      </div>

      {/* =========================================
          PART 2: SCOUT V2.0 (THE AI PIVOT)
          ========================================= */}
      <div
        id="v2"
        className="bg-zinc-900 w-full pt-32 pb-24 relative z-10 border-t border-zinc-800"
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16 text-center">
            <div className="inline-block px-3 py-1 mb-4 text-xs font-bold font-mono tracking-widest text-emerald-400 border border-zinc-700 rounded-full uppercase bg-black/50">
              Part 2: The Hybrid Architecture
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-6">
              Scout v2.0: The AI Pivot
            </h2>
            <p className="text-zinc-400 leading-relaxed max-w-3xl mx-auto text-lg">
              As development shifts towards AI agents, forcing developers to manually copy-paste
              tickets from a dashboard into their IDE leads to hallucinations, broken code, and
              massive token waste. Scout v2.0 solves this by becoming an{' '}
              <strong>invisible orchestrator</strong>.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Feature 1 */}
            <div className="bg-black/40 border border-zinc-800 p-8 rounded-lg hover:border-zinc-700 transition-colors">
              <Server className="text-emerald-400 h-8 w-8 mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">The Invisible Bridge (MCP)</h3>
              <p className="text-zinc-400 leading-relaxed text-sm">
                A local Model Context Protocol (MCP) server runs silently in the background. Paste a
                Jira or GitHub ticket in your IDE and say <em>"Use Scout and solve this."</em> The
                MCP server intercepts the command, queries the external tracker, and hands the full
                context directly to the AI. No tab shifting.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-black/40 border border-zinc-800 p-8 rounded-lg hover:border-zinc-700 transition-colors">
              <GitBranch className="text-blue-400 h-8 w-8 mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">
                Invisible Git Worktree Isolation
              </h3>
              <p className="text-zinc-400 leading-relaxed text-sm">
                If an AI edits files in your main directory, you can't keep working. Scout v2
                silently provisions an isolated Git worktree and branch for every new task. Unleash
                three different agents on three different bugs simultaneously with zero file lock
                conflicts.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-black/40 border border-zinc-800 p-8 rounded-lg hover:border-zinc-700 transition-colors">
              <BrainCircuit className="text-purple-400 h-8 w-8 mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">
                Contextual Memory Virtualisation
              </h3>
              <p className="text-zinc-400 leading-relaxed text-sm">
                To prevent the AI from "forgetting" architecture during long tasks, Scout implements
                a Directed Acyclic Graph (DAG) state model. It safely strips bloated tool outputs
                while perfectly preserving core reasoning via structurally lossless trimming
                algorithms.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-black/40 border border-zinc-800 p-8 rounded-lg hover:border-zinc-700 transition-colors">
              <Lock className="text-orange-400 h-8 w-8 mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">
                Curing "Action Bias" & Cryptographic Safety
              </h3>
              <p className="text-zinc-400 leading-relaxed text-sm">
                A strict "verify-then-abstain" protocol ensures the AI must prove a bug exists
                before writing code. To prevent malicious third-party MCP tools from
                prompt-injecting the system, Scout uses cryptographic attestation to verify tool
                signatures.
              </p>
            </div>
          </div>

          {/* Connect MCP Section */}
          <div className="border-t border-zinc-800 pt-16">
            <div className="text-center mb-12">
              <h3 className="text-2xl font-bold text-white mb-4">Integrate the Scout v2 Harness</h3>
              <p className="text-zinc-400 text-sm">
                By completely eliminating the web dashboard for daily work, Scout v2 became an
                invisible execution layer.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-black/60 border border-zinc-800 p-6 rounded text-left">
                <div className="font-bold text-white mb-4 flex items-center gap-2">
                  <Code2 className="h-5 w-5 text-emerald-400" /> Cursor Config
                </div>
                <div className="bg-zinc-900 p-4 font-mono text-xs text-zinc-300 rounded border border-zinc-800 overflow-x-auto">
                  <pre>{`"scout-v2": {
  "command": "npx",
  "args": ["-y", "@scout/mcp"]
}`}</pre>
                </div>
              </div>
              <div className="bg-black/60 border border-zinc-800 p-6 rounded text-left">
                <div className="font-bold text-white mb-4 flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-blue-400" /> Claude Desktop
                </div>
                <div className="bg-zinc-900 p-4 font-mono text-xs text-zinc-300 rounded border border-zinc-800 overflow-x-auto">
                  <pre>{`"scout-v2": {
  "command": "npx",
  "args": ["-y", "@scout/mcp"]
}`}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="w-full bg-white py-20 text-center relative z-10 border-t border-zinc-200">
        <h2 className="text-4xl font-black text-zinc-900 tracking-tight mb-8">
          The future of open-source is orchestrated.
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/setup"
            className="w-full sm:w-auto bg-zinc-900 text-white font-bold py-3.5 px-10 border-2 border-zinc-900 shadow-[4px_4px_0px_#27272a] hover:-translate-y-px hover:shadow-[5px_5px_0px_#27272a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center rounded-sm"
          >
            Deploy your Scout Backend
          </Link>
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
