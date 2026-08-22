export function Uplink() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 tracking-tight">Uplink</h1>
      <p className="text-zinc-600 mb-8">
        System configuration, API keys, and token budgets.
      </p>
      
      <div className="bg-white border border-zinc-200 p-6 shadow-sm max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Connections</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <span className="font-medium text-zinc-900">GitHub</span>
            <span className="text-emerald-600 text-sm font-medium">Connected</span>
          </div>
          <div className="flex items-center justify-between pb-4">
            <span className="font-medium text-zinc-900">Supabase</span>
            <span className="text-emerald-600 text-sm font-medium">Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
