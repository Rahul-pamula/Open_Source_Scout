import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Terminal,
  Database,
  Server,
  GitBranch,
  ArrowRight,
  BookOpen,
  Layers,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const McpAnimation = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % 4);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-[#0d1117] border border-zinc-800/80 rounded-xl shadow-2xl overflow-hidden flex flex-col font-mono transition-all duration-500 h-[340px]">
      <div className="bg-[#161b22] border-b border-zinc-800 px-4 py-2 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
        </div>
        <div className="text-zinc-500 text-[10px] ml-4 flex-1 text-center font-sans tracking-wide">
          IDE Terminal
        </div>
      </div>

      <div className="p-6 text-xs md:text-sm text-zinc-300 flex-1 relative overflow-hidden">
        <div
          className={`absolute transition-opacity duration-500 ${step === 0 ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="text-zinc-500 mb-2"># 1. Connect IDE to Scout</div>
          <div className="text-emerald-400">{'<System>'} Connecting to Scout MCP Server...</div>
          <div className="text-emerald-400 mt-1">{'<System>'} Validating JSON configuration...</div>
          <div className="text-zinc-300 mt-4 flex items-center gap-2">
            <span className="text-purple-400">{'<You>'}</span> Fix the padding bug in the header.
          </div>
          <div className="text-blue-400 mt-1 animate-pulse">
            {'<AI Agent>'} Analyzing request...
          </div>
        </div>

        <div
          className={`absolute transition-opacity duration-500 ${step === 1 ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="text-zinc-500 mb-2"># 2. Scout provisions isolated worktree</div>
          <div className="text-indigo-400">$ scout worktree create session-a1b2c3</div>
          <div className="text-zinc-400 mt-1">
            Creating isolated git worktree at .scout-tmp/worktrees/session-a1b2c3
          </div>
          <div className="text-zinc-400">Head is now at 2438856...</div>
          <div className="text-emerald-400 mt-2 font-bold flex items-center gap-2">
            <CheckCircle size={14} /> Isolation boundary established.
          </div>
        </div>

        <div
          className={`absolute transition-opacity duration-500 ${step === 2 ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="text-zinc-500 mb-2"># 3. AI safely executes tests</div>
          <div className="text-indigo-400">$ npm run test</div>
          <div className="text-zinc-400 mt-2">
            <span className="text-emerald-400 bg-emerald-400/10 px-1">PASS</span>{' '}
            src/components/Header.test.tsx
          </div>
          <div className="text-zinc-400 mt-1">
            Test Suites: <span className="text-emerald-400">1 passed</span>, 1 total
          </div>
        </div>

        <div
          className={`absolute transition-opacity duration-500 ${step === 3 ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="text-zinc-500 mb-2"># 4. Code securely committed</div>
          <div className="text-indigo-400">$ scout commit -m "fix: resolve header padding bug"</div>
          <div className="text-zinc-400 mt-1">
            [session-a1b2c3 d8f9e0a] fix: resolve header padding bug
          </div>
          <div className="text-emerald-400 mt-6 text-lg font-bold flex items-center gap-2">
            <CheckCircle size={20} /> Task Completed Perfectly.
          </div>
        </div>
      </div>
    </div>
  );
};

const PipelineAnimation = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % 6);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const stages = [
    {
      label: 'Discovery',
      tab: 'DISCOVERY',
      badge: 'UNEVALUATED',
      badgeColor: 'bg-zinc-100 text-zinc-600',
      action: 'Evaluate Issue',
    },
    {
      label: 'Claimed',
      tab: 'CLAIMED',
      badge: 'CLAIMED',
      badgeColor: 'bg-blue-100 text-blue-700',
      action: 'Start Coding',
    },
    {
      label: 'Assigned',
      tab: 'ASSIGNED',
      badge: 'ASSIGNED',
      badgeColor: 'bg-indigo-100 text-indigo-700',
      action: 'Mark Under Review',
    },
    {
      label: 'Under Review',
      tab: 'UNDER REVIEW',
      badge: 'REVIEW',
      badgeColor: 'bg-amber-100 text-amber-700',
      action: 'Merge PR',
    },
    {
      label: 'Merged',
      tab: 'MERGED',
      badge: 'MERGED',
      badgeColor: 'bg-purple-100 text-purple-700',
      action: 'Celebrate 🎉',
    },
    {
      label: 'Dropped',
      tab: 'DROPPED',
      badge: 'DROPPED',
      badgeColor: 'bg-red-100 text-red-700',
      action: 'Find New Issue',
    },
  ];

  const current = stages[step];

  return (
    <div className="w-full bg-white/90 backdrop-blur-sm border border-zinc-200 rounded-xl shadow-xl overflow-hidden flex flex-col font-sans transition-all duration-500 h-[340px]">
      {/* Fake Header/Tabs */}
      <div className="border-b border-zinc-200 px-4 md:px-6 pt-4 flex gap-4 md:gap-6 overflow-x-auto hide-scrollbar">
        {stages.map((s, i) => (
          <div
            key={s.tab}
            className={`pb-3 text-[10px] md:text-xs font-bold tracking-wider transition-colors duration-500 whitespace-nowrap ${step === i ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-zinc-400'}`}
          >
            {s.tab}
          </div>
        ))}
      </div>
      {/* Fake Issue Card */}
      <div className="p-4 md:p-8 bg-zinc-50/50 flex-1 flex items-center justify-center min-h-[250px]">
        <div className="bg-white border border-zinc-200 p-5 md:p-6 rounded-lg shadow-sm w-full max-w-md transform transition-all duration-500 hover:-translate-y-1 hover:shadow-md">
          <div className="flex justify-between items-start mb-4">
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded transition-colors duration-500 ${current.badgeColor}`}
            >
              {current.badge}
            </span>
            <span className="text-zinc-400 text-xs font-mono">#294</span>
          </div>
          <h4 className="font-bold text-zinc-900 mb-2 text-sm md:text-base">
            Implement Animated Pipeline UI
          </h4>
          <p className="text-xs text-zinc-500 mb-5 flex items-center gap-1">
            <GitBranch size={12} />
            Rahul-pamula/Open_Source_Scout
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-200 font-medium">
              good first issue
            </span>
            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-200 font-medium">
              enhancement
            </span>
          </div>
          <div className="mt-6 flex justify-end">
            <button className="bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded shadow-sm transition-all duration-300 hover:bg-emerald-600 flex items-center gap-2">
              {current.action}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export function Landing() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center font-sans overflow-x-hidden selection:bg-emerald-500/30"
      style={{
        backgroundImage: "url('./hero_bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'top center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Top Navigation */}
      <header className="w-full max-w-6xl px-6 py-6 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-2 font-black text-xl text-zinc-900 tracking-tight">
          <img src="./logo.jpg" alt="Logo" className="w-8 h-8 rounded shadow-sm" />
          Open Source Scout
        </div>
        <nav className="flex items-center gap-6">
          <Link
            to="/docs"
            className="text-zinc-600 hover:text-zinc-900 font-bold text-sm flex items-center gap-2 transition-colors"
          >
            <BookOpen size={16} />
            Documentation
          </Link>
          <a
            href="https://github.com/Rahul-pamula/Open_Source_Scout"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-600 hover:text-zinc-900 font-bold text-sm flex items-center gap-2 transition-colors"
          >
            GitHub
          </a>
        </nav>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl w-full px-6 pt-20 pb-24 relative z-10 mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Column: Typography & CTAs */}
          <div className="text-left">
            <h1 className="text-5xl md:text-6xl font-black text-zinc-900 tracking-tight mb-8 leading-[1.2]">
              <span className="text-indigo-600 bg-indigo-50/80 border border-indigo-100/50 px-3 py-0.5 rounded-lg inline-block shadow-sm mb-2">
                Discovering
              </span>{' '}
              Issues,
              <br />
              <span className="text-indigo-600 bg-indigo-50/80 border border-indigo-100/50 px-3 py-0.5 rounded-lg inline-block shadow-sm mb-2">
                Evaluating
              </span>{' '}
              Effort,
              <br />
              <span className="text-indigo-600 bg-indigo-50/80 border border-indigo-100/50 px-3 py-0.5 rounded-lg inline-block shadow-sm">
                Executing
              </span>{' '}
              Safely.
            </h1>

            <p className="text-lg md:text-xl text-zinc-600 mb-10 font-medium leading-relaxed">
              Open Source Scout is a dual-engine architecture for the AI era. Use the{' '}
              <strong>v1 Cloud Dashboard</strong> to manage your GitHub contributions, and the{' '}
              <strong>v2 Local MCP</strong> to safely orchestrate AI agents directly in your IDE.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                to="/setup"
                className="w-full sm:w-auto bg-emerald-500 text-white font-bold py-3.5 px-8 hover:bg-emerald-600 transition-colors flex items-center justify-center rounded"
              >
                Open v1 Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/mcp-setup"
                className="w-full sm:w-auto bg-zinc-900 text-white font-bold py-3.5 px-8 hover:bg-zinc-800 transition-colors flex items-center justify-center rounded"
              >
                Scout v2 Setup
                <Server className="ml-2 h-5 w-5 text-zinc-400" />
              </Link>
            </div>
            <p className="text-xs font-mono text-zinc-400 mt-6">
              Use the hosted interface. Bring your own backend.
            </p>
          </div>

          {/* Right Column: Realistic Blob Image */}
          <div className="relative hidden md:flex justify-end">
            <div className="relative w-full max-w-lg aspect-square">
              {/* Decorative shadow layer */}
              <div
                className="absolute inset-0 bg-indigo-500/10 translate-x-4 translate-y-4"
                style={{ borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }}
              ></div>

              {/* Main image with blob mask */}
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"
                alt="Developers collaborating"
                className="absolute inset-0 w-full h-full object-cover shadow-2xl"
                style={{ borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dual Engine Animation Section */}
      <div className="max-w-7xl w-full px-6 mb-32 relative z-10 mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* V1 Dashboard Side */}
          <div className="flex flex-col">
            <div className="mb-8 min-h-[140px]">
              <h3 className="text-emerald-600 font-mono text-xs tracking-widest uppercase mb-3 font-bold">
                Part 1: The Cloud Dashboard
              </h3>
              <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-4">
                Mission Control Pipeline.
              </h2>
              <p className="text-zinc-500 text-sm leading-relaxed md:text-base">
                Stop guessing where your contributions are. Scout organizes every issue into a
                clean, automated Kanban flow from discovery to merge—including dropping issues that
                aren't a fit.
              </p>
            </div>
            <div className="flex-1 w-full relative">
              {/* Decorative glow */}
              <div className="absolute inset-0 bg-emerald-500/5 blur-3xl rounded-full"></div>
              <div className="relative">
                <PipelineAnimation />
              </div>
            </div>
          </div>

          {/* V2 MCP Side */}
          <div className="flex flex-col">
            <div className="mb-8 min-h-[140px]">
              <h3 className="text-indigo-600 font-mono text-xs tracking-widest uppercase mb-3 font-bold">
                Part 2: The AI Pivot
              </h3>
              <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-4">
                Local MCP Harness.
              </h2>
              <p className="text-zinc-500 text-sm leading-relaxed md:text-base">
                An invisible local orchestrator for the AI era. Provisions isolated git worktrees,
                manages contextual memory, and safely executes code in your IDE to solve the manual
                copy-paste problem.
              </p>
            </div>
            <div className="flex-1 w-full relative">
              {/* Decorative glow */}
              <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full"></div>
              <div className="relative">
                <McpAnimation />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The Problem & Workflow */}
      <div className="max-w-6xl w-full px-6 mb-24 relative z-10">
        <div className="bg-white border border-zinc-200 p-8 shadow-sm">
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
                  <span className="text-emerald-500">→</span> AI Evaluator (Match Score &
                  Difficulty)
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
              <div className="text-zinc-900 font-bold mb-4">// The AI Evaluator</div>
              <div>[INFO] Analyzing issue context...</div>
              <div>[MATCH] Skills aligned with React, TypeScript.</div>
              <div>[DIFF] Estimated difficulty: Intermediate.</div>
              <div>[STATUS] No competing claims detected.</div>
              <div className="text-emerald-600 mt-4 font-bold">READY FOR ENGAGEMENT</div>
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
              <span>Your Browser</span>
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
            <h3 className="font-bold text-zinc-900 mb-2">1. Bring your keys</h3>
            <p className="text-sm text-zinc-600 mb-4">
              You'll need a free Supabase account, a GitHub Personal Access Token, and a Groq API
              key.
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

      {/* MCP Setup Guide */}
      <div className="max-w-6xl w-full px-6 mb-24 relative z-10 text-center">
        <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 font-mono text-xs font-bold mb-6">
          <Server size={14} />
          SCOUT v2 LOCAL ENGINE
        </div>
        <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-4">
          Execute safely with MCP.
        </h2>
        <p className="text-zinc-600 leading-relaxed max-w-2xl mx-auto mb-12">
          Don't give your AI raw shell access. Connect your IDE via the Model Context Protocol to
          execute code in isolated Git worktrees with enforced boundaries. Here is the setup guide
          for your favorite AI assistants.
        </p>

        <div className="max-w-2xl mx-auto text-left">
          <div className="bg-white border border-zinc-200 p-6 shadow-sm rounded-lg">
            <h3 className="font-bold text-zinc-900 mb-2">Universal MCP Configuration</h3>
            <p className="text-sm text-zinc-600 mb-4">
              Add this configuration to your favorite AI assistant (Cursor, Cline, Claude Desktop,
              Antigravity, etc.)
            </p>
            <div className="bg-zinc-950 text-emerald-400 p-4 font-mono text-xs rounded border border-zinc-800 overflow-x-auto">
              <pre>{`"mcpServers": {
  "scout": {
    "command": "npx",
    "args": ["-y", "@scout/mcp"]
  }
}`}</pre>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="w-full bg-white border-t border-zinc-200 py-20 text-center relative z-10">
        <h2 className="text-4xl font-black text-zinc-900 tracking-tight mb-8">
          Stop scrolling. Start contributing.
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/setup"
            className="w-full sm:w-auto bg-zinc-900 text-white font-bold py-3.5 px-10 border-2 border-zinc-900 shadow-[4px_4px_0px_#27272a] hover:-translate-y-px hover:shadow-[5px_5px_0px_#27272a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center rounded-sm"
          >
            Open v1 Dashboard
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
