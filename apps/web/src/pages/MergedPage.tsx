import { useOutletContext } from 'react-router-dom';
import { PartyPopper, ExternalLink } from 'lucide-react';
import type { MissionControlContextType } from './MissionControlContext';
import { IssueCardSkeleton } from '../components/IssueCard';
import type { TrackedIssue } from '../types';

function MergedCard({ issue }: { issue: TrackedIssue }) {
  const issueNumber = issue.github_issue_url.split('/').pop();

  return (
    <div className="bg-white border border-emerald-200 p-4 flex flex-col transition-shadow hover:shadow-md h-full">
      <div className="flex justify-between items-start mb-3 pb-3 border-b border-zinc-100">
        <span className="font-mono text-[9px] px-2 py-1 border border-emerald-200 bg-emerald-50 text-emerald-700 font-bold uppercase tracking-wider">
          COMPLETED ✓
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

      <div className="mt-auto flex items-center gap-2 pt-3 border-t border-zinc-100">
        <a
          href={issue.github_issue_url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-zinc-900 text-white font-bold py-1.5 px-4 shadow-[2px_2px_0px_#10b981] border-2 border-zinc-900 hover:-translate-y-px hover:shadow-[3px_3px_0px_#10b981] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all text-xs flex items-center"
        >
          View Issue <ExternalLink size={12} className="ml-1.5" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <IssueCardSkeleton key={i} />
          ))}
        </div>
      ) : mergedIssues.length === 0 ? (
        <div className="bg-zinc-50 border border-zinc-200 p-8 text-center flex flex-col items-center shadow-sm">
          <p className="text-zinc-500 font-mono text-sm">No merged contributions yet.</p>
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
