import { useOutletContext } from 'react-router-dom';
import { PartyPopper, ExternalLink, Loader2 } from 'lucide-react';
import type { MissionControlContextType } from './MissionControlContext';
import type { TrackedIssue } from '../types';

function MergedCard({ issue }: { issue: TrackedIssue }) {
  const issueNumber = issue.github_issue_url.split('/').pop();

  return (
    <div className="bg-white border border-emerald-200 p-6 flex flex-col transition-shadow hover:shadow-md">
      <div className="flex justify-between items-start mb-4 pb-4 border-b border-zinc-100">
        <span className="font-mono text-[9px] px-2 py-1 border border-emerald-200 bg-emerald-50 text-emerald-700 font-bold uppercase tracking-wider">
          COMPLETED ✓
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

      <div className="mt-auto flex items-center gap-3 pt-4 border-t border-zinc-100">
        <a
          href={issue.github_issue_url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-zinc-900 text-white font-bold py-2 px-4 shadow-[4px_4px_0px_#10b981] border-2 border-zinc-900 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#10b981] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all text-sm flex items-center"
        >
          View Issue <ExternalLink size={14} className="ml-2" />
        </a>
      </div>
    </div>
  );
}

export function MergedPage() {
  const ctx = useOutletContext<MissionControlContextType>();

  const mergedIssues = ctx.trackedIssues.filter((i) => i.state === 'COMPLETED');

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2">
          <PartyPopper size={16} />
          Merged
          <span className="font-mono text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 border border-emerald-100">
            {mergedIssues.length}
          </span>
        </h2>
      </div>

      {ctx.isTrackingLoading ? (
        <div className="flex items-center justify-center py-12 border border-zinc-100 bg-white">
          <Loader2 size={20} className="animate-spin text-zinc-300 mr-3" />
          <span className="text-zinc-400 font-mono text-xs">Loading merged issues...</span>
        </div>
      ) : mergedIssues.length === 0 ? (
        <div className="bg-zinc-50 border border-zinc-200 p-8 text-center">
          <p className="text-zinc-500 font-mono text-sm mb-2">No merged issues yet.</p>
          <p className="text-zinc-400 font-mono text-xs">
            Issues will appear here once they are completed and merged!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mergedIssues.map((issue) => (
            <MergedCard key={issue.id} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}
