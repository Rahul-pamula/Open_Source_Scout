import { ExternalLink, Bookmark } from 'lucide-react';
import type { ScoutedIssue } from '../types';

interface IssueCardProps {
  issue: ScoutedIssue;
  onSave?: (id: string) => void;
  onClaim?: (url: string) => void;
  isClaiming?: boolean;
  claimLabel?: string;
}

export function IssueCard({
  issue,
  onSave,
  onClaim,
  isClaiming,
  claimLabel = '🙌 Claim This Issue',
}: IssueCardProps) {
  const { evaluation } = issue;

  // Determine score color
  let scoreColor = 'text-zinc-400';
  let scoreLabel = 'UNEVALUATED';

  if (evaluation) {
    if (evaluation.matchScore >= 80) {
      scoreColor = 'text-emerald-500';
      scoreLabel = 'GOOD MATCH';
    } else if (evaluation.matchScore >= 50) {
      scoreColor = 'text-yellow-500';
      scoreLabel = 'OKAY MATCH';
    } else {
      scoreColor = 'text-red-400';
      scoreLabel = 'POOR MATCH';
    }
  }

  return (
    <div className="bg-white border border-zinc-200 p-4 flex flex-col transition-shadow hover:shadow-md h-full">
      {/* Header: Match Score & Intent */}
      <div className="flex justify-between items-start mb-3 pb-3 border-b border-zinc-100">
        <div className="flex flex-col">
          <span className={`font-mono text-[10px] font-bold tracking-widest ${scoreColor}`}>
            {scoreLabel}
          </span>
          {evaluation && (
            <span className="text-zinc-500 text-xs mt-0.5 leading-tight">{evaluation.intent}</span>
          )}
        </div>

        {evaluation && (
          <div className={`text-xl font-bold font-mono ${scoreColor}`}>
            {evaluation.matchScore}%
          </div>
        )}
      </div>

      {/* Title & Repo */}
      <div className="mb-3">
        <h3 className="text-lg font-bold text-zinc-900 leading-snug mb-1">{issue.title}</h3>
        <a
          href={issue.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 font-mono text-xs hover:text-emerald-600 transition-colors inline-flex items-center"
        >
          {issue.repoName}
          <ExternalLink size={10} className="ml-1" />
        </a>
      </div>

      {/* Labels */}
      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {issue.labels.map((label) => (
            <span
              key={label}
              className="bg-zinc-100 text-zinc-600 font-mono text-[10px] px-1.5 py-0.5 border border-zinc-200"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* AI Explanation */}
      {evaluation && (
        <div className="bg-zinc-50 p-3 border border-zinc-100 mb-4 relative group">
          <div className="absolute -top-2 left-3 bg-zinc-50 px-1.5 text-[10px] font-bold text-emerald-600 tracking-wider">
            SCOUT ANALYSIS
          </div>
          <p className="text-zinc-700 text-xs leading-relaxed mt-1">{evaluation.explanation}</p>
        </div>
      )}

      {/* Footer Actions */}
      <div className="mt-auto flex items-center justify-between pt-3">
        <div className="flex gap-2">
          <a
            href={issue.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-zinc-900 text-white font-bold py-1.5 px-4 shadow-[2px_2px_0px_#10b981] border-2 border-zinc-900 hover:-translate-y-px hover:shadow-[3px_3px_0px_#10b981] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all text-xs flex items-center"
          >
            View Issue <ExternalLink size={12} className="ml-1.5" />
          </a>

          {onClaim && (
            <button
              onClick={() => onClaim(issue.url)}
              disabled={isClaiming}
              className="bg-emerald-500 text-white font-bold py-1.5 px-3 shadow-[2px_2px_0px_#059669] border-2 border-emerald-600 hover:-translate-y-px hover:shadow-[3px_3px_0px_#059669] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all text-xs flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isClaiming ? 'Claiming...' : claimLabel}
            </button>
          )}
        </div>

        {onSave && (
          <button
            onClick={() => onSave(issue.id)}
            className="text-zinc-400 hover:text-emerald-500 transition-colors p-1.5 flex items-center gap-1.5 text-xs font-medium"
          >
            <Bookmark size={14} /> Save
          </button>
        )}
      </div>
    </div>
  );
}

export function IssueCardSkeleton() {
  return (
    <div className="bg-white border border-zinc-200 p-4 flex flex-col h-full animate-pulse">
      <div className="flex justify-between items-start mb-3 pb-3 border-b border-zinc-100">
        <div className="flex flex-col gap-2 w-1/3">
          <div className="h-2 bg-zinc-200 w-24"></div>
          <div className="h-2 bg-zinc-100 w-32"></div>
        </div>
        <div className="h-5 bg-zinc-200 w-10"></div>
      </div>

      <div className="mb-4 space-y-2">
        <div className="h-4 bg-zinc-200 w-3/4"></div>
        <div className="h-4 bg-zinc-200 w-1/2"></div>
        <div className="h-2 bg-zinc-100 w-1/3 mt-2"></div>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="h-4 bg-zinc-100 w-16"></div>
        <div className="h-4 bg-zinc-100 w-20"></div>
        <div className="h-4 bg-zinc-100 w-14"></div>
      </div>

      <div className="bg-zinc-50 p-3 border border-zinc-100 mb-4 h-16"></div>

      <div className="mt-auto flex items-center justify-between pt-3">
        <div className="flex gap-2">
          <div className="h-8 bg-zinc-200 w-24"></div>
          <div className="h-8 bg-zinc-200 w-28"></div>
        </div>
        <div className="h-6 bg-zinc-100 w-16"></div>
      </div>
    </div>
  );
}
