import { ArrowRight, Globe, MessageSquare, Layers, Zap } from 'lucide-react';

export default function IntegrationsPage() {
  const integrations = [
    {
      id: 'github',
      name: 'GitHub',
      description: 'Connect your repositories to sync issues and PRs.',
      icon: Globe,
      status: 'connected',
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Get notifications and updates in your Slack channels.',
      icon: MessageSquare,
      status: 'available',
    },
    {
      id: 'linear',
      name: 'Linear',
      description: 'Sync tasks and track progress with Linear issues.',
      icon: Layers,
      status: 'available',
    },
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Connect with thousands of other apps via Zapier.',
      icon: Zap,
      status: 'coming_soon',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Integrations Hub</h1>
        <p className="text-zinc-400">Connect Open Source Scout with your favorite tools.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          return (
            <div
              key={integration.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center">
                  <Icon className="w-6 h-6 text-zinc-100" />
                </div>
                {integration.status === 'connected' && (
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full">
                    Connected
                  </span>
                )}
                {integration.status === 'coming_soon' && (
                  <span className="px-3 py-1 bg-zinc-800 text-zinc-400 text-xs font-medium rounded-full">
                    Coming Soon
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">{integration.name}</h3>
              <p className="text-zinc-400 text-sm flex-grow mb-6">{integration.description}</p>
              <button
                className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2
                  ${
                    integration.status === 'connected'
                      ? 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                      : integration.status === 'coming_soon'
                        ? 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                disabled={integration.status === 'coming_soon'}
              >
                {integration.status === 'connected'
                  ? 'Configure'
                  : integration.status === 'coming_soon'
                    ? 'Waitlist'
                    : 'Connect'}
                {integration.status === 'available' && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
