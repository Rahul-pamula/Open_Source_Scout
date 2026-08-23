import { ExternalLink, Bookmark } from 'lucide-react';
import type { ScoutedIssue } from '../types';

interface IssueCardProps {
  issue: ScoutedIssue;
  onSave?: (id: string) => void;
}

export function IssueCard({ issue, onSave }: IssueCardProps) {
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
    <div className="bg-white border border-zinc-200 p-6 flex flex-col transition-shadow hover:shadow-md">
      {/* Header: Match Score & Intent */}
      <div className="flex justify-between items-start mb-4 pb-4 border-b border-zinc-100">
        <div className="flex flex-col">
          <span className={`font-mono text-xs font-bold tracking-widest ${scoreColor}`}>
            {scoreLabel}
          </span>
          {evaluation && (
            <span className="text-zinc-500 text-sm mt-1">{evaluation.intent}</span>
          )}
        </div>
        
        {evaluation && (
          <div className={`text-2xl font-bold font-mono ${scoreColor}`}>
            {evaluation.matchScore}%
          </div>
        )}
      </div>

      {/* Title & Repo */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-zinc-900 leading-tight mb-2">
          {issue.title}
        </h3>
        <a 
          href={issue.repoUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-zinc-500 font-mono text-sm hover:text-emerald-600 transition-colors inline-flex items-center"
        >
          {issue.repoName}
          <ExternalLink size={12} className="ml-1" />
        </a>
      </div>

      {/* Labels */}
      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {issue.labels.map(label => (
            <span key={label} className="bg-zinc-100 text-zinc-600 font-mono text-xs px-2 py-1 border border-zinc-200">
              {label}
            </span>
          ))}
        </div>
      )}

      {/* AI Explanation */}
      {evaluation && (
        <div className="bg-zinc-50 p-4 border border-zinc-100 mb-6 relative group">
          <div className="absolute -top-3 left-4 bg-zinc-50 px-2 text-xs font-bold text-emerald-600 tracking-wider">
            SCOUT ANALYSIS
          </div>
          <p className="text-zinc-700 text-sm leading-relaxed mt-2">
            {evaluation.explanation}
          </p>
        </div>
      )}

      {/* Footer Actions */}
      <div className="mt-auto flex items-center justify-between pt-4">
        <a 
          href={issue.url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-zinc-900 text-white font-bold py-2 px-6 shadow-[4px_4px_0px_#10b981] border-2 border-zinc-900 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#10b981] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all text-sm flex items-center"
        >
          View Issue <ExternalLink size={14} className="ml-2" />
        </a>
        
        {onSave && (
          <button 
            onClick={() => onSave(issue.id)}
            className="text-zinc-400 hover:text-emerald-500 transition-colors p-2 flex items-center gap-2 text-sm font-medium"
          >
            <Bookmark size={18} /> Save
          </button>
        )}
      </div>
    </div>
  );
}
