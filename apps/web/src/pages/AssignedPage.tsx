import { useOutletContext } from 'react-router-dom';

import { CheckSquare, ExternalLink, Loader2 } from 'lucide-react';
import type { MissionControlContextType } from './MissionControlContext';
import { IssueCardSkeleton } from '../components/IssueCard';
import type { TrackedIssue } from '../types';

function AssignedCard({
  issue,
  isPending,
  onMarkUnderReview,
  onMarkDropped,
}: {
  issue: TrackedIssue;
  isPending?: boolean;
  onMarkUnderReview: () => Promise<void>;
  onMarkDropped: () => void;
}) {
  const issueNumber = issue.github_issue_url.split('/').pop();

  const handleReviewClick = async () => {
    if (isPending) return;
    await onMarkUnderReview();
  };

  return (
    <div className="bg-white border border-blue-200 p-4 flex flex-col transition-shadow hover:shadow-md h-full">
      <div className="flex justify-between items-start mb-3 pb-3 border-b border-zinc-100">
        <span className="font-mono text-[10px] font-bold tracking-widest text-blue-700 border border-blue-200 bg-blue-50 px-2 py-1">
          ASSIGNED
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
            View Issue <ExternalLink size={12} className="ml-1.5" />
          </a>
          <button
            onClick={handleReviewClick}
            disabled={isPending}
            className="bg-blue-600 text-white font-bold py-1.5 px-3 shadow-[2px_2px_0px_#1e3a8a] border-2 border-blue-800 hover:-translate-y-px hover:shadow-[3px_3px_0px_#1e3a8a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:pointer-events-none transition-all text-xs flex items-center gap-1.5"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : '👀'}
            {isPending ? 'Updating...' : 'Mark Under Review'}
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

export function AssignedPage() {
  const ctx = useOutletContext<MissionControlContextType>();

  const assignedIssues = ctx.trackedIssues.filter(
    (i) => i.state === 'ASSIGNED' && !i.contribution_checklist?.under_review,
  );

  const handleMarkUnderReview = async (issue: TrackedIssue) => {
    const currentChecklist = issue.contribution_checklist || {};
    await ctx.handleUpdateChecklist(issue.id, { ...currentChecklist, under_review: true });
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-blue-700 uppercase tracking-widest flex items-center gap-2">
          <CheckSquare size={16} />
          Assigned Issues
          <span className="font-mono text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 border border-blue-100">
            {assignedIssues.length}
          </span>
        </h2>
      </div>

      {ctx.isTrackingLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <IssueCardSkeleton key={i} />
          ))}
        </div>
      ) : assignedIssues.length === 0 ? (
        <div className="bg-zinc-50 border border-zinc-200 p-8 text-center flex flex-col items-center shadow-sm">
          <p className="text-zinc-500 font-mono text-sm mb-4">
            No assigned issues yet. Claimed issues that receive a maintainer assignment will appear
            here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignedIssues.map((issue) => (
            <AssignedCard
              key={issue.id}
              issue={issue}
              isPending={!!ctx.pendingIssues[issue.id]}
              onMarkUnderReview={() => handleMarkUnderReview(issue)}
              onMarkDropped={() => ctx.handleUpdateState(issue.id, 'REJECTED')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
