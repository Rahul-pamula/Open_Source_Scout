import { useOutletContext } from 'react-router-dom';
import { Activity, AlertTriangle, ExternalLink, Loader2, Zap } from 'lucide-react';
import type { MissionControlContextType } from './MissionControlContext';
import type { TrackedIssue } from '../types';

function ClaimedCard({
  issue,
  onMakeAssigned,
  onMarkNotAssigned,
}: {
  issue: TrackedIssue;
  onMakeAssigned: () => void;
  onMarkNotAssigned: () => void;
}) {
  const issueNumber = issue.github_issue_url.split('/').pop();
  // Detect claim method from state or fallback to AUTO (worker sets state directly)
  const claimedVia = (issue as any).claimed_via || 'AUTO';
  const isManual = claimedVia === 'MANUAL';

  return (
    <div className="bg-white border border-zinc-200 p-6 flex flex-col transition-shadow hover:shadow-md">
      {/* Header: Claimed badge */}
      <div className="flex justify-between items-start mb-4 pb-4 border-b border-zinc-100">
        <span
          className={`font-mono text-xs font-bold tracking-widest px-2 py-1 border ${
            isManual
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {isManual ? '🤚 CLAIMED MANUALLY' : '⚡ CLAIMED BY AUTO'}
        </span>
        <span
          className={`font-mono text-[9px] px-2 py-1 border font-bold uppercase tracking-wider ${
            issue.state === 'ENGAGED'
              ? 'border-violet-200 bg-violet-50 text-violet-700'
              : 'border-zinc-200 bg-zinc-50 text-zinc-500'
          }`}
        >
          {issue.state}
        </span>
      </div>

      {/* Title & Repo */}
      <div className="mb-4">
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

      {/* Actions */}
      <div className="mt-auto flex items-center justify-between pt-4">
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
            onClick={onMakeAssigned}
            className="bg-emerald-500 text-white font-bold py-2 px-4 shadow-[4px_4px_0px_#059669] border-2 border-emerald-600 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#059669] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all text-sm"
          >
            ✅ Make Assigned
          </button>
        </div>
        <button
          onClick={onMarkNotAssigned}
          className="text-zinc-400 hover:text-red-500 transition-colors text-xs font-mono font-bold uppercase tracking-wider flex items-center"
        >
          Drop / Close
        </button>
      </div>
    </div>
  );
}

export function AutomationPage() {
  const ctx = useOutletContext<MissionControlContextType>();

  const claimedIssues = ctx.trackedIssues.filter((i) => i.state === 'ENGAGED');

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
          <Activity
            size={16}
            className={ctx.isAutomating ? 'text-emerald-500 animate-pulse' : 'text-zinc-400'}
          />
          Claimed Issues
          <span className="font-mono text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5">
            {claimedIssues.length}
          </span>
        </h2>
        <span
          className={`font-mono text-xs px-2 py-1 border ${ctx.automationCountToday >= 25 ? 'border-red-200 bg-red-50 text-red-600 font-bold' : 'border-zinc-200 bg-zinc-50 text-zinc-500'}`}
        >
          {ctx.automationCountToday} / 25 TODAY
        </span>
      </div>

      {/* Rate limit warning */}
      <div className="bg-yellow-50 border border-yellow-200 p-3 flex gap-2 items-start text-[10px] text-yellow-800 font-mono">
        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-yellow-600" />
        <p>
          <strong>WARNING:</strong> Excessive automated engagement may trigger GitHub bot detection.
          Automation is strictly rate-limited to 25 issues per day.
        </p>
      </div>

      {ctx.automationError && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3 font-mono text-xs">
          [ERROR] {ctx.automationError}
        </div>
      )}

      {/* Automate control bar */}
      <div className="flex items-center justify-between border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-zinc-900">Auto-claim from Discovery</span>
          <span className="text-[10px] font-mono text-zinc-400">
            Scout will post claim comments on your scouted opportunities automatically.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={ctx.automationBatchSize}
            onChange={(e) => ctx.setAutomationBatchSize(Number(e.target.value))}
            disabled={ctx.isAutomating || ctx.automationCountToday >= 25}
            className="border border-zinc-300 p-2 text-xs font-mono bg-white outline-none focus:border-emerald-500 disabled:bg-zinc-50 disabled:text-zinc-400"
          >
            <option value={1}>1 Issue</option>
            <option value={2}>2 Issues</option>
            <option value={5}>5 Issues</option>
          </select>
          <button
            onClick={ctx.handleAutomateProcess}
            disabled={ctx.isAutomating || ctx.automationCountToday >= 25}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 text-white font-bold py-2 px-5 border-2 border-emerald-800 shadow-[2px_2px_0px_#065f46] hover:-translate-y-px hover:shadow-[3px_3px_0px_#065f46] disabled:shadow-none disabled:translate-y-0 disabled:border-zinc-300 transition-all uppercase tracking-widest text-xs flex items-center gap-2"
          >
            {ctx.isAutomating ? (
              <>
                <Loader2 size={12} className="animate-spin" /> RUNNING...
              </>
            ) : ctx.automationCountToday >= 25 ? (
              'LIMIT REACHED'
            ) : (
              <>
                <Zap size={12} /> AUTOMATE NOW
              </>
            )}
          </button>
        </div>
      </div>

      {/* Claimed issues grid */}
      {ctx.isTrackingLoading ? (
        <div className="flex items-center justify-center py-12 border border-zinc-100 bg-white">
          <Loader2 size={20} className="animate-spin text-zinc-300 mr-3" />
          <span className="text-zinc-400 font-mono text-xs">Loading claimed issues...</span>
        </div>
      ) : claimedIssues.length === 0 ? (
        <div className="bg-zinc-50 border border-zinc-200 p-8 text-center">
          <p className="text-zinc-500 font-mono text-sm mb-2">No claimed issues yet.</p>
          <p className="text-zinc-400 font-mono text-xs">
            Go to Discovery and click "🙌 Claim This Issue", or use the Automate Now button above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {claimedIssues.map((issue) => (
            <ClaimedCard
              key={issue.id}
              issue={issue}
              onMakeAssigned={() => ctx.handleUpdateState(issue.id, 'ASSIGNED')}
              onMarkNotAssigned={() => ctx.handleUpdateState(issue.id, 'REJECTED')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
