import { useOutletContext } from 'react-router-dom';
import { CheckSquare, ExternalLink, Loader2, Square } from 'lucide-react';
import type { MissionControlContextType } from './MissionControlContext';
import type { TrackedIssue } from '../types';

function AssignedCard({
  issue,
  onMarkCompleted,
  onMarkMerged,
  onMarkUnderReview,
}: {
  issue: TrackedIssue;
  onMarkCompleted: () => void;
  onMarkMerged: () => void;
  onMarkUnderReview: () => void;
}) {
  const issueNumber = issue.github_issue_url.split('/').pop();
  const checklist = issue.contribution_checklist || {};
  const isUnderReview = checklist.under_review || false;
  const isCompleted = issue.state === 'COMPLETED';

  return (
    <div
      className={`bg-white border p-6 flex flex-col transition-shadow hover:shadow-md ${
        isCompleted ? 'border-emerald-200 opacity-80' : 'border-zinc-200'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4 pb-4 border-b border-zinc-100">
        <span className="font-mono text-xs font-bold tracking-widest text-blue-700 border border-blue-200 bg-blue-50 px-2 py-1">
          ASSIGNED
        </span>
        {isCompleted && (
          <span className="font-mono text-[9px] px-2 py-1 border border-emerald-200 bg-emerald-50 text-emerald-700 font-bold uppercase tracking-wider">
            COMPLETED ✓
          </span>
        )}
      </div>

      {/* Title & Repo */}
      <div className="mb-5">
        <h3
          className={`text-xl font-bold leading-tight mb-2 ${isCompleted ? 'line-through text-zinc-400' : 'text-zinc-900'}`}
        >
          {issue.title}
        </h3>
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

      {/* Progress Checklist */}
      <div className="flex flex-col gap-3 mb-5 bg-zinc-50 border border-zinc-100 p-4">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
          Progress
        </p>

        {/* Under Review */}
        <button
          onClick={onMarkUnderReview}
          disabled={isCompleted}
          className="flex items-center gap-3 text-left group disabled:cursor-default"
        >
          {isUnderReview ? (
            <CheckSquare size={18} className="text-emerald-500 shrink-0" />
          ) : (
            <Square size={18} className="text-zinc-300 group-hover:text-zinc-500 shrink-0" />
          )}
          <span
            className={`text-sm font-medium ${isUnderReview ? 'line-through text-zinc-400' : 'text-zinc-700 group-hover:text-zinc-900'}`}
          >
            Under Review / PR Submitted
          </span>
        </button>

        {/* Mark as Merged */}
        <button
          onClick={onMarkCompleted}
          disabled={isCompleted}
          className="flex items-center gap-3 text-left group disabled:cursor-default"
        >
          {isCompleted ? (
            <CheckSquare size={18} className="text-emerald-500 shrink-0" />
          ) : (
            <Square size={18} className="text-zinc-300 group-hover:text-zinc-500 shrink-0" />
          )}
          <span
            className={`text-sm font-medium ${isCompleted ? 'line-through text-zinc-400' : 'text-zinc-700 group-hover:text-zinc-900'}`}
          >
            Mark as Merged / Completed
          </span>
        </button>
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center gap-3 pt-4">
        <a
          href={issue.github_issue_url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-zinc-900 text-white font-bold py-2 px-4 shadow-[4px_4px_0px_#10b981] border-2 border-zinc-900 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#10b981] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all text-sm flex items-center"
        >
          View Issue <ExternalLink size={14} className="ml-2" />
        </a>
        {!isCompleted && (
          <button
            onClick={onMarkMerged}
            className="bg-emerald-500 text-white font-bold py-2 px-4 shadow-[4px_4px_0px_#059669] border-2 border-emerald-600 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#059669] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all text-sm"
          >
            🎉 Mark Merged
          </button>
        )}
      </div>
    </div>
  );
}

export function AssignedPage() {
  const ctx = useOutletContext<MissionControlContextType>();

  const assignedIssues = ctx.trackedIssues.filter(
    (i) => i.state === 'ASSIGNED' || i.state === 'COMPLETED',
  );

  const handleMarkUnderReview = async (issue: TrackedIssue) => {
    const currentChecklist = issue.contribution_checklist || {};
    const isUnderReview = currentChecklist.under_review || false;
    try {
      await (ctx as any).supabase?.functions.invoke('tracking', {
        body: {
          action: 'update_checklist',
          id: issue.id,
          checklist: { ...currentChecklist, under_review: !isUnderReview },
        },
      });
      // Refresh pipeline
      await ctx.fetchPipeline();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
          <CheckSquare size={16} className="text-zinc-400" />
          Assigned Issues
          <span className="font-mono text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5">
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
              onMarkCompleted={() => ctx.handleUpdateState(issue.id, 'COMPLETED')}
              onMarkMerged={() => ctx.handleUpdateState(issue.id, 'COMPLETED')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
