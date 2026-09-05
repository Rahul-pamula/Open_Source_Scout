import { Link } from 'react-router-dom';
import {
  Terminal,
  Key,
  Database,
  ShieldCheck,
  ArrowRight,
  Server,
  Globe,
  Copy,
} from 'lucide-react';
import { SetupNotepad } from '../components/SetupNotepad';

export function Setup() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center py-12 px-4 font-sans">
      <div className="mb-10 text-center max-w-3xl">
        <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-4">Deploy Your Scout</h1>
        <p className="text-zinc-600 text-lg">
          Open Source Scout has zero central servers. Follow these steps to deploy your personal
          backend. Your keys never leave your machine.
        </p>
      </div>

      <div className="max-w-6xl w-full flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Side: Setup Steps */}
        <div className="flex-1 space-y-6 w-full lg:max-w-3xl">
          {/* Step 1 */}
          <div className="bg-white border border-zinc-200 p-6 flex gap-4 shadow-sm rounded-lg hover:border-emerald-200 transition-colors">
            <div className="bg-emerald-100 p-3 h-fit rounded-full text-emerald-700">
              <Database size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">1. Create a Supabase Database</h3>
              <p className="text-sm text-zinc-600 mt-1 mb-3">
                Create a free PostgreSQL database to store your tracking boards and profiles.
              </p>
              <ol className="list-decimal pl-5 text-sm text-zinc-700 space-y-2">
                <li>
                  Go to{' '}
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    supabase.com
                  </a>
                  , create an account, and start a new project.
                </li>
                <li>
                  Enter a strong <strong>Database Password</strong> (save it to your scratchpad).
                </li>
                <li>
                  Once the project builds, go to <strong>Project Settings -&gt; General</strong>.
                  Copy your <code>Project ID</code> (e.g. abcdef...) into the Scratchpad.
                </li>
              </ol>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white border border-zinc-200 p-6 flex gap-4 shadow-sm rounded-lg hover:border-emerald-200 transition-colors">
            <div className="bg-blue-100 p-3 h-fit rounded-full text-blue-700">
              <Server size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">2. Get your Supabase API Keys</h3>
              <p className="text-sm text-zinc-600 mt-1 mb-3">
                You need both the public anon key for the browser connection and the access token
                for the CLI deployment.
              </p>
              <ol className="list-decimal pl-5 text-sm text-zinc-700 space-y-2">
                <li>
                  In your Supabase project, go to{' '}
                  <a
                    href="https://supabase.com/dashboard/project/projectid/settings/api-keys/legacy"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Project Settings -&gt; API -&gt; Legacy API Keys
                  </a>
                  .
                </li>
                <li>
                  Copy the <strong>anon key</strong> (starts with <code>eyJ</code>) into the
                  Scratchpad. This is the public browser key used by the Connect screen.
                </li>
                <li>
                  Then open your{' '}
                  <a
                    href="https://supabase.com/dashboard/account/tokens"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Account Access Tokens
                  </a>
                  .
                </li>
                <li>
                  Click <strong>Generate new token</strong>, give it a name, and copy the{' '}
                  <strong>Supabase Access Token</strong> (starts with <code>sbp_</code>) into the
                  Scratchpad.
                </li>
              </ol>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white border border-zinc-200 p-6 flex gap-4 shadow-sm rounded-lg hover:border-emerald-200 transition-colors">
            <div className="bg-zinc-100 p-3 h-fit rounded-full text-zinc-900">
              <Key size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">3. Get your AI & GitHub Keys</h3>
              <p className="text-sm text-zinc-600 mt-1 mb-3">
                You will need two more keys to power the AI integrations and repository fetching.
              </p>
              <div className="space-y-4">
                <div>
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline font-bold text-sm"
                  >
                    Groq API Key
                  </a>
                  <p className="text-xs text-zinc-500 mt-1 mb-2">
                    Used to evaluate issues. Click "Create API Key" in the Groq console.
                  </p>
                </div>
                <div>
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline font-bold text-sm"
                  >
                    GitHub Classic Personal Access Token
                  </a>
                  <div className="text-xs text-zinc-500 mt-1">
                    <ol className="list-decimal pl-4 space-y-1 mt-1 mb-2">
                      <li>
                        Click <strong>Generate new token (classic)</strong>.
                      </li>
                      <li>
                        Give it a Note (e.g. <strong>Open Source Scout</strong>).
                      </li>
                      <li>
                        Change the <strong>Expiration</strong> to <strong>No expiration</strong> (or
                        your preferred duration).
                      </li>
                      <li>
                        Under <strong>Select scopes</strong>, explicitly check the box for{' '}
                        <strong>public_repo</strong> (Access public repositories).
                      </li>
                      <li>
                        Scroll down and click <strong>Generate token</strong>.
                      </li>
                    </ol>
                    <p className="text-xs italic text-red-500 font-bold mt-2">
                      ⚠️ CRITICAL: DO NOT use a "Fine-grained token"! Fine-grained tokens are
                      blocked from commenting on external open source repositories.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 flex gap-4 text-white shadow-md rounded-lg">
            <div className="bg-zinc-800 p-3 h-fit rounded-full text-emerald-400">
              <Terminal size={24} />
            </div>
            <div className="w-full">
              <h3 className="text-lg font-bold">4. Run the CLI Setup</h3>
              <p className="text-sm text-zinc-400 mt-1 mb-4">
                Run this command in your terminal. It will prompt you for the keys you collected in
                the scratchpad, securely inject them into your Supabase Vault, and deploy the Edge
                Functions.
              </p>

              <div className="bg-black p-4 rounded text-sm font-mono text-emerald-400 border border-zinc-800 whitespace-pre overflow-x-auto selection:bg-emerald-500/30">
                npx open-source-scout setup
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="bg-white border border-zinc-200 p-6 flex gap-4 shadow-sm rounded-lg hover:border-emerald-200 transition-colors">
            <div className="bg-orange-100 p-3 h-fit rounded-full text-orange-700">
              <Globe size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">5. Configure Supabase Auth URLs</h3>
              <p className="text-sm text-zinc-600 mt-1 mb-3">
                Ensure GitHub OAuth redirects back to your frontend correctly.
              </p>
              <ol className="list-decimal pl-5 text-sm text-zinc-700 space-y-2">
                <li>
                  In your Supabase Dashboard, go to{' '}
                  <strong>Authentication &gt; URL Configuration</strong>.
                </li>
                <li>
                  Set the <strong>Site URL</strong> exactly to:{' '}
                  <code
                    onClick={() =>
                      navigator.clipboard.writeText(
                        'https://Rahul-pamula.github.io/Open_Source_Scout',
                      )
                    }
                    className="bg-orange-100 text-orange-900 px-2 py-1 rounded cursor-pointer hover:bg-orange-200 transition-colors inline-flex items-center gap-1 group"
                    title="Click to copy"
                  >
                    https://Rahul-pamula.github.io/Open_Source_Scout
                    <Copy className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                  </code>
                </li>
                <li>
                  Add the exact URL with a wildcard to the <strong>Redirect URLs</strong>:{' '}
                  <code
                    onClick={() =>
                      navigator.clipboard.writeText(
                        'https://Rahul-pamula.github.io/Open_Source_Scout/*',
                      )
                    }
                    className="bg-orange-100 text-orange-900 px-2 py-1 rounded cursor-pointer hover:bg-orange-200 transition-colors inline-flex items-center gap-1 group"
                    title="Click to copy"
                  >
                    https://Rahul-pamula.github.io/Open_Source_Scout/*
                    <Copy className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                  </code>
                </li>
              </ol>
            </div>
          </div>

          {/* Step 6 */}
          <div className="bg-white border border-zinc-200 p-6 flex gap-4 shadow-sm rounded-lg hover:border-emerald-200 transition-colors">
            <div className="bg-purple-100 p-3 h-fit rounded-full text-purple-700">
              <ShieldCheck size={24} />
            </div>
            <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">6. Ready to Go!</h3>
                <p className="text-sm text-zinc-600 mt-1">
                  Once the CLI finishes successfully, you are ready to connect to your personal
                  backend.
                </p>
              </div>
              <Link
                to="/connect"
                className="whitespace-nowrap bg-zinc-900 text-white font-bold py-2.5 px-6 border-2 border-zinc-900 shadow-[3px_3px_0px_#27272a] hover:-translate-y-px hover:shadow-[4px_4px_0px_#27272a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center rounded-md"
              >
                Go to Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Side: Key Scratchpad */}
        <div className="w-full lg:w-[400px] flex-shrink-0">
          <SetupNotepad />
        </div>
      </div>
    </div>
  );
}
