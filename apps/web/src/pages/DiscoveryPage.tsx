import { useOutletContext } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { MissionControlContextType } from './MissionControlContext';
import { IssueCard } from '../components/IssueCard';

export function DiscoveryPage() {
  const ctx = useOutletContext<MissionControlContextType>();

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
          <Search size={16} className="text-zinc-400" /> Scouted Opportunities
        </h2>
        <button
          onClick={ctx.handleDiscover}
          disabled={ctx.isDiscovering}
          className="text-xs font-mono border border-zinc-200 bg-white hover:bg-zinc-50 px-3 py-1 font-medium disabled:opacity-50"
        >
          {ctx.isDiscovering ? 'Scanning...' : 'Scan Now'}
        </button>
      </div>

      {ctx.discoveryError && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 font-mono text-sm">
          [ERROR] {ctx.discoveryError}
        </div>
      )}

      {ctx.scoutedIssues.length === 0 && !ctx.isDiscovering && !ctx.discoveryError ? (
        <div className="bg-zinc-50 border border-zinc-200 p-8 text-center flex flex-col items-center shadow-sm">
          <p className="text-zinc-500 font-mono text-sm mb-4">No new opportunities in your feed.</p>
          <button
            onClick={ctx.handleDiscover}
            className="bg-emerald-500 text-white font-bold py-2 px-4 shadow-[2px_2px_0px_#18181b] border border-zinc-900 hover:-translate-y-px hover:shadow-[3px_3px_0px_#18181b] transition-all text-xs"
          >
            Trigger Manual Scan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ctx.scoutedIssues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onSave={ctx.handleSaveToPipeline}
              onClaim={ctx.handleClaimIssue}
              isClaiming={ctx.claimingIssueUrl === issue.url}
            />
          ))}
        </div>
      )}
    </div>
  );
}
