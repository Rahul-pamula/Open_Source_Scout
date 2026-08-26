import { Link } from 'react-router-dom';
import { Terminal, Key, Database, ShieldCheck, ArrowRight } from 'lucide-react';

export function Setup() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center py-16 px-4 font-sans">
      <div className="max-w-3xl w-full">
        
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-4">Deploy Your Scout</h1>
          <p className="text-zinc-600 text-lg">
            Open Source Scout has zero central servers. Follow these steps to deploy your personal backend. Your keys never leave your machine.
          </p>
        </div>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="bg-white border border-zinc-200 p-6 flex gap-4">
            <div className="bg-zinc-100 p-3 h-fit rounded-full text-zinc-900">
              <Key size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">1. Get your API Keys</h3>
              <p className="text-sm text-zinc-600 mt-1 mb-3">You will need three keys to deploy the backend and power the AI integrations.</p>
              <div className="space-y-4">
                <div>
                  <a href="https://supabase.com/dashboard/account/tokens" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold text-sm">Supabase Access Token</a>
                  <p className="text-xs text-zinc-500 mt-1">Used by the CLI to deploy to your database. Click "Generate new token", give it a name, and copy the token.</p>
                </div>
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

          {/* Step 2 */}
          <div className="bg-white border border-zinc-200 p-6 flex gap-4">
            <div className="bg-emerald-100 p-3 h-fit rounded-full text-emerald-700">
              <Database size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">2. Create a Database</h3>
              <p className="text-sm text-zinc-600 mt-1 mb-3">Create a free PostgreSQL database on Supabase to store your tracking boards and profiles.</p>
              <ol className="list-decimal pl-5 text-sm text-zinc-700 space-y-1">
                <li>Go to <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">supabase.com</a> and create a new project.</li>
                <li>Go to <strong>Project Settings -&gt; API</strong>.</li>
                <li>Copy your <code>Project URL</code> and <code>anon</code> public key. Keep them handy.</li>
              </ol>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 flex gap-4 text-white">
            <div className="bg-zinc-800 p-3 h-fit rounded-full text-emerald-400">
              <Terminal size={24} />
            </div>
            <div className="w-full">
              <h3 className="text-lg font-bold">3. Run the CLI Setup</h3>
              <p className="text-sm text-zinc-400 mt-1 mb-4">First, clone the repository. Then run the setup wizard. It will prompt you for your keys, securely inject them into your Supabase Vault, and deploy the Edge Functions.</p>
              
              <div className="bg-black p-4 rounded text-sm font-mono text-emerald-400 border border-zinc-800 whitespace-pre overflow-x-auto">
                git clone https://github.com/Rahul-pamula/Open_Source_Scout.git{'\n'}
                cd Open_Source_Scout{'\n'}
                npx open-source-scout setup
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white border border-zinc-200 p-6 flex gap-4">
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
                className="whitespace-nowrap bg-zinc-900 text-white font-bold py-2 px-6 border border-zinc-900 shadow-[3px_3px_0px_#27272a] hover:-translate-y-px hover:shadow-[4px_4px_0px_#27272a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center"
              >
                Go to Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
