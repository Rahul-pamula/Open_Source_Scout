import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { MissionControlContextType } from './MissionControlContext';
import { IssueCard, IssueCardSkeleton } from '../components/IssueCard';

export type SortOption = 'relevance' | 'recency' | 'competition';

export function DiscoveryPage() {
  const ctx = useOutletContext<MissionControlContextType>();
  const [sortBy, setSortBy] = useState<SortOption>('relevance');

  const sortedIssues = useMemo(() => {
    const list = [...ctx.scoutedIssues];
    if (sortBy === 'relevance') {
      return list.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
    } else if (sortBy === 'recency') {
      return list.sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
    } else if (sortBy === 'competition') {
      return list.sort((a, b) => (a.commentsCount ?? 0) - (b.commentsCount ?? 0));
    }
    return list;
  }, [ctx.scoutedIssues, sortBy]);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
          <Search size={16} className="text-zinc-400" /> Scouted Opportunities
        </h2>
        <div className="flex items-center gap-2">
          {ctx.scoutedIssues.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-zinc-500">Sort by:</span>
              <select
                data-testid="discovery-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-white border border-zinc-200 px-2 py-1 text-xs font-mono rounded text-zinc-700 hover:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="relevance">Highest Relevance</option>
                <option value="recency">Most Recent</option>
                <option value="competition">Lowest Competition</option>
              </select>
            </div>
          )}
          <button
            onClick={ctx.handleDiscover}
            disabled={ctx.isDiscovering}
            className="text-xs font-mono border border-zinc-200 bg-white hover:bg-zinc-50 px-3 py-1 font-medium disabled:opacity-50 rounded"
          >
            {ctx.isDiscovering ? 'Scanning...' : 'Scan Now'}
          </button>
        </div>
      </div>

      {ctx.discoveryError && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 font-mono text-sm">
          [ERROR] {ctx.discoveryError}
        </div>
      )}

      {ctx.isDiscovering ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <IssueCardSkeleton key={i} />
          ))}
        </div>
      ) : ctx.scoutedIssues.length === 0 && !ctx.discoveryError ? (
        <div className="bg-zinc-50 border border-zinc-200 p-8 text-center flex flex-col items-center shadow-sm">
          <p className="text-zinc-500 font-mono text-sm mb-4">
            No issues discovered yet. Run a scan to find issues matched to your profile.
          </p>
          <button
            onClick={ctx.handleDiscover}
            className="bg-emerald-500 text-white font-bold py-2 px-4 shadow-[2px_2px_0px_#18181b] border border-zinc-900 hover:-translate-y-px hover:shadow-[3px_3px_0px_#18181b] transition-all text-xs"
          >
            Trigger Manual Scan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedIssues.map((issue) => (
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
