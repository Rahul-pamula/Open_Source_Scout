import { useOutletContext } from 'react-router-dom';
import { Eye, ExternalLink, Loader2 } from 'lucide-react';
import type { MissionControlContextType } from './MissionControlContext';
import { IssueCardSkeleton } from '../components/IssueCard';
import type { TrackedIssue } from '../types';

function ReviewCard({
  issue,
  isPending,
  onMarkMerged,
  onMarkDropped,
}: {
  issue: TrackedIssue;
  isPending?: boolean;
  onMarkMerged: () => void;
  onMarkDropped: () => void;
}) {
  const issueNumber = issue.github_issue_url.split('/').pop();

  return (
    <div className="bg-white border border-yellow-200 p-4 flex flex-col transition-shadow hover:shadow-md h-full">
      <div className="flex justify-between items-start mb-3 pb-3 border-b border-zinc-100">
        <span className="font-mono text-[10px] font-bold tracking-widest text-yellow-700 border border-yellow-200 bg-yellow-50 px-2 py-1">
          UNDER REVIEW
        </span>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-bold text-zinc-900 leading-snug mb-1">{issue.title}</h3>
        <a
          href={issue.github_issue_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 font-mono text-xs hover:text-emerald-600 transition-colors inline-flex items-center"
        >
          {issue.repo_name} #{issueNumber}
          <ExternalLink size={10} className="ml-1" />
        </a>
      </div>

      <div className="mt-auto flex items-center justify-between pt-3 border-t border-zinc-100">
        <div className="flex gap-2">
          <a
            href={issue.github_issue_url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-zinc-900 text-white font-bold py-1.5 px-4 shadow-[2px_2px_0px_#10b981] border-2 border-zinc-900 hover:-translate-y-px hover:shadow-[3px_3px_0px_#10b981] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all text-xs flex items-center"
          >
            View PR / Issue <ExternalLink size={12} className="ml-1.5" />
          </a>
          <button
            onClick={onMarkMerged}
            disabled={isPending}
            className="bg-emerald-500 text-white font-bold py-1.5 px-3 shadow-[2px_2px_0px_#059669] border-2 border-emerald-600 hover:-translate-y-px hover:shadow-[3px_3px_0px_#059669] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all text-xs disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : '🎉'}
            {isPending ? 'Updating...' : 'Mark Merged'}
          </button>
        </div>
        <button
          onClick={onMarkDropped}
          disabled={isPending}
          className="text-zinc-400 hover:text-red-500 transition-colors text-xs font-mono font-bold uppercase tracking-wider flex items-center disabled:opacity-50 disabled:pointer-events-none"
        >
          {isPending ? 'Updating...' : 'Drop / Close'}
        </button>
      </div>
    </div>
  );
}

export function ReviewPage() {
  const ctx = useOutletContext<MissionControlContextType>();

  const reviewIssues = ctx.trackedIssues.filter(
    (i) => i.state === 'ASSIGNED' && i.contribution_checklist?.under_review,
  );

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
          <Eye size={16} className="text-zinc-400" />
          Under Review
          <span className="font-mono text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5">
            {reviewIssues.length}
          </span>
        </h2>
      </div>

      {ctx.isTrackingLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <IssueCardSkeleton key={i} />
          ))}
        </div>
      ) : reviewIssues.length === 0 ? (
        <div className="bg-zinc-50 border border-zinc-200 p-8 text-center flex flex-col items-center shadow-sm">
          <p className="text-zinc-500 font-mono text-sm">No pull requests under review yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviewIssues.map((issue) => (
            <ReviewCard
              key={issue.id}
              issue={issue}
              isPending={!!ctx.pendingIssues[issue.id]}
              onMarkMerged={() => ctx.handleUpdateState(issue.id, 'COMPLETED')}
              onMarkDropped={() => ctx.handleUpdateState(issue.id, 'REJECTED')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
