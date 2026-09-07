import { Link } from 'react-router-dom';
import {
  Terminal,
  Key,
  Database,
  ShieldCheck,
  ArrowRight,
  Server,
  Globe,
  Info,
} from 'lucide-react';
import { SetupNotepad } from '../components/SetupNotepad';
import { getSupabaseConfig } from '../services/supabase';

export function Setup() {
  const frontendUrl = `${window.location.origin}${import.meta.env.BASE_URL}`;
  const frontendUrlNoTrailing = frontendUrl.replace(/\/$/, '');
  const config = getSupabaseConfig();
  const supabaseCallbackUrl = config?.url
    ? `${config.url.replace(/\/$/, '')}/auth/v1/callback`
    : `https://<YOUR_PROJECT>.supabase.co/auth/v1/callback`;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center py-12 px-4 font-sans">
      <div className="mb-10 text-center max-w-3xl">
        <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-4">
          Deploy Your Scout Backend
        </h1>
        <p className="text-zinc-600 text-lg mb-6">
          You don't need to deploy the frontend. Use this hosted Scout interface and connect it to
          your own Supabase backend. Follow these steps to configure your decentralized
          infrastructure.
        </p>

        <div className="flex items-center justify-center gap-6 font-mono text-sm">
          <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded border border-emerald-200 shadow-sm text-center">
            <div className="font-bold">FRONTEND</div>
            <div className="text-xs mt-1">Ready to use</div>
          </div>
          <ArrowRight className="text-zinc-300" />
          <div className="bg-white text-zinc-800 px-4 py-2 rounded border border-zinc-200 shadow-sm text-center">
            <div className="font-bold">BACKEND</div>
            <div className="text-xs mt-1">You deploy & own</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl w-full flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Side: Setup Steps */}
        <div className="flex-1 space-y-6 w-full lg:max-w-3xl">
          {/* Step 1: Create Supabase */}
          <div className="bg-white border border-zinc-200 p-6 shadow-sm rounded-lg hover:border-emerald-200 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-emerald-100 p-2 rounded-full text-emerald-700">
                <Database size={20} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900">1. Create Supabase Project</h3>
            </div>

            <div className="space-y-4 text-sm text-zinc-700">
              <div className="bg-zinc-50 p-3 rounded border border-zinc-100">
                <div className="font-bold text-zinc-900 text-xs uppercase mb-1">
                  Why you need it
                </div>
                Scout stores tracking boards, profiles, and application state in your own PostgreSQL
                database.
              </div>

              <div>
                <div className="font-bold text-zinc-900 text-xs uppercase mb-1">
                  Where to get it
                </div>
                Go to{' '}
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline font-bold"
                >
                  supabase.com
                </a>
                , create an account, and start a new project.
              </div>

              <div>
                <div className="font-bold text-zinc-900 text-xs uppercase mb-1">What to do</div>
                Enter a strong <strong>Database Password</strong> (save it to your scratchpad). Once
                built, go to <strong>Project Settings -&gt; General</strong>.
              </div>

              <div>
                <div className="font-bold text-zinc-900 text-xs uppercase mb-1">
                  What to copy & paste
                </div>
                Copy your <code>Project ID</code> (e.g. abcdef...) into the Scratchpad on the right.
              </div>
            </div>
          </div>

          {/* Step 2: Supabase Keys */}
          <div className="bg-white border border-zinc-200 p-6 shadow-sm rounded-lg hover:border-emerald-200 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-2 rounded-full text-blue-700">
                <Server size={20} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900">2. Get Supabase Credentials</h3>
            </div>

            <div className="space-y-4 text-sm text-zinc-700">
              <div className="bg-zinc-50 p-3 rounded border border-zinc-100">
                <div className="font-bold text-zinc-900 text-xs uppercase mb-1">
                  Why you need it
                </div>
                The <strong>Anon Key</strong> connects your browser to your database securely. The{' '}
                <strong>Access Token</strong> allows the setup CLI to deploy your edge functions
                automatically.
              </div>

              <div>
                <div className="font-bold text-zinc-900 text-xs uppercase mb-1">
                  Where to get it
                </div>
                In your Supabase dashboard, go to{' '}
                <strong>Project Settings -&gt; API -&gt; Legacy API Keys</strong>.
              </div>

              <div>
                <div className="font-bold text-zinc-900 text-xs uppercase mb-1">
                  What to copy & paste
                </div>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>
                    Copy the <strong>Anon Key</strong> (starts with <code>eyJ</code>) into the
                    Scratchpad.
                  </li>
                  <li>
                    Then go to{' '}
                    <a
                      href="https://supabase.com/dashboard/account/tokens"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Account Access Tokens
                    </a>
                    . Click <strong>Generate new token</strong>.
                  </li>
                  <li>
                    Copy the <strong>Access Token</strong> (starts with <code>sbp_</code>) into the
                    Scratchpad.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Step 3: API Keys */}
          <div className="bg-white border border-zinc-200 p-6 shadow-sm rounded-lg hover:border-emerald-200 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-zinc-100 p-2 rounded-full text-zinc-900">
                <Key size={20} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900">3. Get Groq API Key</h3>
            </div>

            <div className="space-y-4 text-sm text-zinc-700">
              <div className="bg-zinc-50 p-3 rounded border border-zinc-100">
                <div className="font-bold text-zinc-900 text-xs uppercase mb-1">
                  Why you need it
                </div>
                Powers the AI analysis (match scoring, difficulty estimation, context-aware draft
                generation).
              </div>

              <div>
                <div className="font-bold text-zinc-900 text-xs uppercase mb-1">
                  Where to get it
                </div>
                Go to{' '}
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline font-bold"
                >
                  Groq Console
                </a>{' '}
                and click "Create API Key".
              </div>

              <div>
                <div className="font-bold text-zinc-900 text-xs uppercase mb-1">
                  What to copy & paste
                </div>
                Copy the generated key (starts with <code>gsk_</code>) into the Scratchpad.
              </div>
            </div>
          </div>

          {/* Step 4: GitHub PAT */}
          <div className="bg-white border border-zinc-200 p-6 shadow-sm rounded-lg hover:border-emerald-200 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-zinc-100 p-2 rounded-full text-zinc-900">
                <Key size={20} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900">4. Create GitHub PAT</h3>
            </div>

            <div className="space-y-4 text-sm text-zinc-700">
              <div className="bg-zinc-50 p-3 rounded border border-zinc-100">
                <div className="font-bold text-zinc-900 text-xs uppercase mb-1">
                  Why you need it
                </div>
                Allows Scout's backend edge functions to search repositories, fetch issues, and post
                comments on your behalf.
              </div>

              <div>
                <div className="font-bold text-zinc-900 text-xs uppercase mb-1">
                  Where to get it
                </div>
                Go to{' '}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline font-bold"
                >
                  GitHub Personal Access Tokens (Classic)
                </a>
                . Generate a new token with `repo` scope.
              </div>

              <div className="bg-red-50 text-red-700 p-3 rounded border border-red-200 text-xs font-bold flex items-start gap-2">
                <Info size={16} className="shrink-0 mt-0.5" />
                CRITICAL: DO NOT use a "Fine-grained token". They are currently blocked by GitHub
                from commenting on external open source repositories via API.
              </div>

              <div>
                <div className="font-bold text-zinc-900 text-xs uppercase mb-1">
                  What to copy & paste
                </div>
                Copy the generated token (starts with <code>ghp_</code>) into the Scratchpad.
              </div>
            </div>
          </div>

          {/* Step 5: GitHub OAuth App */}
          <div className="bg-white border border-zinc-200 p-6 shadow-sm rounded-lg hover:border-emerald-200 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-sky-100 p-2 rounded-full text-sky-700">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900">5. Create GitHub OAuth App</h3>
            </div>

            <div className="space-y-4 text-sm text-zinc-700">
              <div className="bg-zinc-50 p-3 rounded border border-zinc-100">
                <div className="font-bold text-zinc-900 text-xs uppercase mb-1">
                  Why you need it
                </div>
                Allows you to sign in to your own Supabase instance using your GitHub account
                safely.
              </div>

              <div>
                <div className="font-bold text-zinc-900 text-xs uppercase mb-1">
                  Where to get it
                </div>
                Open GitHub:{' '}
                <a
                  href="https://github.com/settings/applications/new"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline font-bold"
                >
                  Register a new OAuth App
                </a>
                .
              </div>

              <div>
                <div className="font-bold text-zinc-900 text-xs uppercase mb-1">
                  What to copy & paste into GitHub
                </div>
                <ul className="list-disc pl-5 mt-1 space-y-2">
                  <li>
                    <strong>Homepage URL:</strong>{' '}
                    <code className="bg-zinc-100 px-1 rounded text-xs break-all">
                      {frontendUrl}
                    </code>
                  </li>
                  <li>
                    <strong>Authorization callback URL:</strong>{' '}
                    <code
                      onClick={() => navigator.clipboard.writeText(supabaseCallbackUrl)}
                      className="bg-zinc-100 px-1 rounded text-xs break-all cursor-pointer hover:bg-zinc-200"
                      title="Click to copy"
                    >
                      {supabaseCallbackUrl}
                    </code>
                  </li>
                </ul>
              </div>

              <div>
                <div className="font-bold text-zinc-900 text-xs uppercase mb-1">
                  What to copy & paste into Supabase
                </div>
                Click <strong>Register application</strong> in GitHub. Copy the{' '}
                <strong>Client ID</strong> and generate a <strong>Client Secret</strong>.
                <br />
                <br />
                Go to Supabase Dashboard → <strong>Authentication → Providers → GitHub</strong>.
                Paste the ID and Secret, and toggle <strong>Enabled</strong>.
              </div>
            </div>
          </div>

          {/* Step 6: Supabase Auth URLs */}
          <div className="bg-white border border-zinc-200 p-6 shadow-sm rounded-lg hover:border-emerald-200 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-orange-100 p-2 rounded-full text-orange-700">
                <Globe size={20} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900">
                6. Configure Supabase OAuth Redirects
              </h3>
            </div>

            <div className="space-y-4 text-sm text-zinc-700">
              <div className="bg-zinc-50 p-3 rounded border border-zinc-100">
                <div className="font-bold text-zinc-900 text-xs uppercase mb-1">
                  Why you need it
                </div>
                Tells Supabase that it is allowed to redirect successful logins back to this
                specific frontend URL.
              </div>

              <div>
                <div className="font-bold text-zinc-900 text-xs uppercase mb-1">
                  Where to configure
                </div>
                In your Supabase Dashboard, go to{' '}
                <strong>Authentication &gt; URL Configuration</strong>.
              </div>

              <div>
                <div className="font-bold text-zinc-900 text-xs uppercase mb-1">What to paste</div>
                <ul className="list-disc pl-5 mt-1 space-y-2">
                  <li>
                    <strong>Site URL:</strong>{' '}
                    <code
                      onClick={() => navigator.clipboard.writeText(frontendUrlNoTrailing)}
                      className="bg-zinc-100 px-1 rounded text-xs cursor-pointer hover:bg-zinc-200"
                      title="Click to copy"
                    >
                      {frontendUrlNoTrailing}
                    </code>
                  </li>
                  <li>
                    <strong>Redirect URLs:</strong> Add{' '}
                    <code
                      onClick={() => navigator.clipboard.writeText(`${frontendUrlNoTrailing}/*`)}
                      className="bg-zinc-100 px-1 rounded text-xs cursor-pointer hover:bg-zinc-200"
                      title="Click to copy"
                    >
                      {frontendUrlNoTrailing}/*
                    </code>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Step 7: Run CLI */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 text-white shadow-md rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-zinc-800 p-2 rounded-full text-emerald-400">
                <Terminal size={20} />
              </div>
              <h3 className="text-xl font-bold">7. Run the Setup CLI</h3>
            </div>

            <div className="space-y-4 text-sm text-zinc-400">
              <div className="bg-zinc-800 p-3 rounded border border-zinc-700">
                <div className="font-bold text-white text-xs uppercase mb-1">Why you need it</div>
                The CLI securely pushes the database schema, edge functions, and your secret API
                keys (Groq/GitHub) into your Supabase Vault.
              </div>

              <div>
                <div className="font-bold text-white text-xs uppercase mb-2">What to do</div>
                Run this command in your local terminal. It will prompt you for the keys you
                collected in the scratchpad.
              </div>

              <div className="bg-black p-4 rounded font-mono text-emerald-400 border border-zinc-700 whitespace-pre overflow-x-auto selection:bg-emerald-500/30">
                npx open-source-scout setup
              </div>
            </div>
          </div>

          {/* Step 8: Done */}
          <div className="bg-white border border-emerald-200 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm rounded-lg hover:border-emerald-300 transition-colors">
            <div>
              <h3 className="text-lg font-bold text-zinc-900">8. Connect and start scouting!</h3>
              <p className="text-sm text-zinc-600 mt-1">
                Once the CLI finishes successfully, you are ready to connect the frontend to your
                personal backend.
              </p>
            </div>
            <Link
              to="/connect"
              className="whitespace-nowrap bg-emerald-600 text-white font-bold py-3 px-6 border-2 border-emerald-800 shadow-[3px_3px_0px_#065f46] hover:-translate-y-px hover:shadow-[4px_4px_0px_#065f46] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center rounded"
            >
              Connect Backend
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Right Side: Key Scratchpad */}
        <div className="w-full lg:w-[400px] flex-shrink-0 sticky top-6">
          <SetupNotepad />
        </div>
      </div>
    </div>
  );
}
