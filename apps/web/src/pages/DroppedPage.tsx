import { useOutletContext } from 'react-router-dom';
import { ArchiveX, ExternalLink, Loader2 } from 'lucide-react';
import type { MissionControlContextType } from './MissionControlContext';
import { IssueCardSkeleton } from '../components/IssueCard';
import type { TrackedIssue } from '../types';

function DroppedCard({
  issue,
  isPending,
  onRestore,
}: {
  issue: TrackedIssue;
  isPending?: boolean;
  onRestore: () => void;
}) {
  const issueNumber = issue.github_issue_url.split('/').pop();

  return (
    <div className="bg-white border border-red-200 p-4 flex flex-col transition-shadow hover:shadow-md opacity-75 grayscale-[0.3] h-full">
      <div className="flex justify-between items-start mb-3 pb-3 border-b border-zinc-100">
        <span className="font-mono text-[9px] px-2 py-1 border border-red-200 bg-red-50 text-red-700 font-bold uppercase tracking-wider">
          DROPPED / CLOSED
        </span>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-bold text-zinc-900 leading-snug mb-1 line-through decoration-red-300">
          {issue.title}
        </h3>
        <a
          href={issue.github_issue_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 font-mono text-xs hover:text-red-600 transition-colors inline-flex items-center"
        >
          {issue.repo_name} #{issueNumber}
          <ExternalLink size={10} className="ml-1" />
        </a>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-3 border-t border-zinc-100">
        <a
          href={issue.github_issue_url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-zinc-100 text-zinc-700 font-bold py-1.5 px-4 shadow-[2px_2px_0px_#fca5a5] border-2 border-zinc-300 hover:-translate-y-px hover:shadow-[3px_3px_0px_#fca5a5] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all text-xs flex items-center"
        >
          View Issue <ExternalLink size={12} className="ml-1.5" />
        </a>
        <button
          onClick={onRestore}
          disabled={isPending}
          className="bg-emerald-500 text-white font-bold py-1.5 px-3 shadow-[2px_2px_0px_#059669] border-2 border-emerald-600 hover:-translate-y-px hover:shadow-[3px_3px_0px_#059669] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all text-xs disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : '♻️'}
          {isPending ? 'Restoring...' : 'Restore'}
        </button>
      </div>
    </div>
  );
}

export function DroppedPage() {
  const ctx = useOutletContext<MissionControlContextType>();

  const droppedIssues = ctx.trackedIssues.filter((i) => i.state === 'REJECTED');

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-red-600 uppercase tracking-widest flex items-center gap-2">
          <ArchiveX size={16} />
          Dropped
          <span className="font-mono text-[10px] bg-red-50 text-red-600 px-2 py-0.5 border border-red-100">
            {droppedIssues.length}
          </span>
        </h2>
      </div>

      {ctx.isTrackingLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <IssueCardSkeleton key={i} />
          ))}
        </div>
      ) : droppedIssues.length === 0 ? (
        <div className="bg-zinc-50 border border-zinc-200 p-8 text-center flex flex-col items-center shadow-sm">
          <p className="text-zinc-500 font-mono text-sm">No dropped issues yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {droppedIssues.map((issue) => (
            <DroppedCard
              key={issue.id}
              issue={issue}
              isPending={!!ctx.pendingIssues[issue.id]}
              onRestore={() => ctx.handleUpdateState(issue.id, 'ENGAGED')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
