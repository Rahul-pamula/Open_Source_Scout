import { Globe, CheckCircle2 } from 'lucide-react';

export default function IntegrationsPage() {
  return (
    <div className="max-w-4xl mx-auto pb-12 w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 mb-2">Integrations Hub</h1>
        <p className="text-zinc-600 font-mono text-sm">
          Connect Open Source Scout with your favorite tools.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-6 flex flex-col hover:border-emerald-500/50 hover:shadow-md transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-zinc-50 border border-zinc-100 rounded-lg flex items-center justify-center shadow-sm">
              <Globe className="w-6 h-6 text-zinc-700" />
            </div>
            <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5">
              <CheckCircle2 size={12} />
              Connected
            </span>
          </div>
          <h3 className="text-lg font-bold text-zinc-900 mb-2">GitHub</h3>
          <p className="text-zinc-500 text-sm flex-grow mb-6">
            Connect your repositories to sync issues and PRs automatically into your Mission Control
            pipeline.
          </p>
          <button className="w-full py-2.5 px-4 rounded-lg text-sm font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors">
            Configure Sync
          </button>
        </div>
      </div>
    </div>
  );
}
