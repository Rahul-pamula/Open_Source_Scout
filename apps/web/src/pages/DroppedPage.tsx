import { useOutletContext } from 'react-router-dom';
import { ArchiveX, ExternalLink, Loader2 } from 'lucide-react';
import type { MissionControlContextType } from './MissionControlContext';
import type { TrackedIssue } from '../types';

function DroppedCard({ issue }: { issue: TrackedIssue }) {
  const issueNumber = issue.github_issue_url.split('/').pop();

  return (
    <div className="bg-white border border-red-200 p-6 flex flex-col transition-shadow hover:shadow-md opacity-75 grayscale-[0.3]">
      <div className="flex justify-between items-start mb-4 pb-4 border-b border-zinc-100">
        <span className="font-mono text-[9px] px-2 py-1 border border-red-200 bg-red-50 text-red-700 font-bold uppercase tracking-wider">
          DROPPED / CLOSED
        </span>
      </div>

      <div className="mb-5">
        <h3 className="text-xl font-bold text-zinc-900 leading-tight mb-2 line-through decoration-red-300">
          {issue.title}
        </h3>
        <a
          href={issue.github_issue_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 font-mono text-sm hover:text-red-600 transition-colors inline-flex items-center"
        >
          {issue.repo_name} #{issueNumber}
          <ExternalLink size={12} className="ml-1" />
        </a>
      </div>

      <div className="mt-auto flex items-center gap-3 pt-4 border-t border-zinc-100">
        <a
          href={issue.github_issue_url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-zinc-100 text-zinc-700 font-bold py-2 px-4 shadow-[4px_4px_0px_#fca5a5] border-2 border-zinc-300 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#fca5a5] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all text-sm flex items-center"
        >
          View Issue <ExternalLink size={14} className="ml-2" />
        </a>
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
        <div className="flex items-center justify-center py-12 border border-zinc-100 bg-white">
          <Loader2 size={20} className="animate-spin text-zinc-300 mr-3" />
          <span className="text-zinc-400 font-mono text-xs">Loading dropped issues...</span>
        </div>
      ) : droppedIssues.length === 0 ? (
        <div className="bg-zinc-50 border border-zinc-200 p-8 text-center">
          <p className="text-zinc-500 font-mono text-sm mb-2">No dropped issues.</p>
          <p className="text-zinc-400 font-mono text-xs">
            Issues that you drop or are closed as not-assigned will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {droppedIssues.map((issue) => (
            <DroppedCard key={issue.id} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}
