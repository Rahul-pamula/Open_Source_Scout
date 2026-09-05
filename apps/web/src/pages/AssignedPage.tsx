import { useOutletContext } from 'react-router-dom';
import { CheckSquare, ExternalLink, Loader2 } from 'lucide-react';
import type { MissionControlContextType } from './MissionControlContext';
import type { TrackedIssue } from '../types';

function AssignedCard({
  issue,
  onMarkUnderReview,
  onMarkDropped,
}: {
  issue: TrackedIssue;
  onMarkUnderReview: () => void;
  onMarkDropped: () => void;
}) {
  const issueNumber = issue.github_issue_url.split('/').pop();

  return (
    <div className="bg-white border border-blue-200 p-6 flex flex-col transition-shadow hover:shadow-md">
      <div className="flex justify-between items-start mb-4 pb-4 border-b border-zinc-100">
        <span className="font-mono text-xs font-bold tracking-widest text-blue-700 border border-blue-200 bg-blue-50 px-2 py-1">
          ASSIGNED
        </span>
      </div>

      <div className="mb-5">
        <h3 className="text-xl font-bold text-zinc-900 leading-tight mb-2">{issue.title}</h3>
        <a
          href={issue.github_issue_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 font-mono text-sm hover:text-emerald-600 transition-colors inline-flex items-center"
        >
          {issue.repo_name} #{issueNumber}
          <ExternalLink size={12} className="ml-1" />
        </a>
      </div>

      <div className="mt-auto flex items-center justify-between pt-4 border-t border-zinc-100">
        <div className="flex gap-2">
          <a
            href={issue.github_issue_url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-zinc-900 text-white font-bold py-2 px-4 shadow-[4px_4px_0px_#10b981] border-2 border-zinc-900 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#10b981] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all text-sm flex items-center"
          >
            View Issue <ExternalLink size={14} className="ml-2" />
          </a>
          <button
            onClick={onMarkUnderReview}
            className="bg-blue-600 text-white font-bold py-2 px-4 shadow-[4px_4px_0px_#1e3a8a] border-2 border-blue-800 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#1e3a8a] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all text-sm"
          >
            👀 Mark Under Review
          </button>
        </div>
        <button
          onClick={onMarkDropped}
          className="text-zinc-400 hover:text-red-500 transition-colors text-xs font-mono font-bold uppercase tracking-wider flex items-center"
        >
          Drop / Close
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
    try {
      await (ctx as any).supabase?.functions.invoke('tracking', {
        body: {
          action: 'update_checklist',
          id: issue.id,
          checklist: { ...currentChecklist, under_review: true },
        },
      });
      await ctx.fetchPipeline();
    } catch (e) {
      console.error(e);
    }
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
        <div className="flex items-center justify-center py-12 border border-zinc-100 bg-white">
          <Loader2 size={20} className="animate-spin text-zinc-300 mr-3" />
          <span className="text-zinc-400 font-mono text-xs">Loading assigned issues...</span>
        </div>
      ) : assignedIssues.length === 0 ? (
        <div className="bg-zinc-50 border border-zinc-200 p-8 text-center">
          <p className="text-zinc-500 font-mono text-sm mb-2">No assigned issues yet.</p>
          <p className="text-zinc-400 font-mono text-xs">
            Go to the Claimed tab and click "✅ Make Assigned" when a maintainer assigns you.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignedIssues.map((issue) => (
            <AssignedCard
              key={issue.id}
              issue={issue}
              onMarkUnderReview={() => handleMarkUnderReview(issue)}
              onMarkDropped={() => ctx.handleUpdateState(issue.id, 'REJECTED')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
