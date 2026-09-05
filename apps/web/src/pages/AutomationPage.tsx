import { useOutletContext } from 'react-router-dom';
import { Activity, AlertTriangle, ExternalLink, Loader2, Zap, Hand } from 'lucide-react';
import type { MissionControlContextType } from './MissionControlContext';

export function AutomationPage() {
  const ctx = useOutletContext<MissionControlContextType>();

  // Issues that have been claimed (engaged or further along)
  const claimedIssues = ctx.trackedIssues.filter(
    (i) => i.state === 'ENGAGED' || i.state === 'ASSIGNED' || i.state === 'COMPLETED',
  );

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
          <Activity
            size={16}
            className={ctx.isAutomating ? 'text-emerald-500 animate-pulse' : 'text-zinc-400'}
          />
          Automation Center
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

      {/* Automate All control */}
      <div className="flex items-center justify-between border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-zinc-900">Automate from Discovery</span>
          <span className="text-[10px] font-mono text-zinc-400">
            Scout will automatically claim{' '}
            <span className="font-bold text-zinc-600">{ctx.automationBatchSize}</span> issue
            {ctx.automationBatchSize !== 1 ? 's' : ''} from your scouted opportunities.
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

      {/* Claimed Issues List */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <Activity size={14} /> Claimed Issues ({claimedIssues.length})
        </h3>

        {ctx.isTrackingLoading ? (
          <div className="flex items-center justify-center py-10 border border-zinc-100 bg-white">
            <Loader2 size={20} className="animate-spin text-zinc-300 mr-3" />
            <span className="text-zinc-400 font-mono text-xs">Loading...</span>
          </div>
        ) : claimedIssues.length === 0 ? (
          <div className="bg-zinc-50 border border-zinc-200 p-8 text-center">
            <p className="text-zinc-500 font-mono text-sm">
              No claimed issues yet. Go to Discovery and click "🙌 Claim This Issue" or use Automate
              Now above.
            </p>
          </div>
        ) : (
          <div className="flex flex-col border border-zinc-200 bg-white shadow-sm divide-y divide-zinc-100">
            {claimedIssues.map((issue) => {
              const issueNumber = issue.github_issue_url.split('/').pop();
              // Determine method: issues saved via the worker arrive with ENGAGED state set server-side
              // We use the contribution_checklist field to check if claimed_via was stored
              const claimedVia = (issue as any).claimed_via || 'AUTO';
              const isManual = claimedVia === 'MANUAL';

              return (
                <div
                  key={issue.id}
                  className="flex items-center gap-4 p-4 hover:bg-zinc-50/50 transition-colors"
                >
                  {/* Method badge */}
                  <div
                    className={`shrink-0 flex items-center gap-1 font-mono text-[9px] font-bold uppercase px-2 py-1 border ${
                      isManual
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {isManual ? (
                      <>
                        <Hand size={9} /> MANUAL
                      </>
                    ) : (
                      <>
                        <Zap size={9} /> AUTO
                      </>
                    )}
                  </div>

                  {/* Title & Meta */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <span
                      className="text-sm font-semibold text-zinc-900 truncate"
                      title={issue.title}
                    >
                      {issue.title}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">
                      {issue.repo_name} #{issueNumber} · {formatTime(issue.updated_at)}
                    </span>
                  </div>

                  {/* State */}
                  <span
                    className={`shrink-0 font-mono text-[9px] px-2 py-1 border font-bold uppercase tracking-wider ${
                      issue.state === 'COMPLETED'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : issue.state === 'ASSIGNED'
                          ? 'border-blue-200 bg-blue-50 text-blue-700'
                          : 'border-violet-200 bg-violet-50 text-violet-700'
                    }`}
                  >
                    {issue.state}
                  </span>

                  {/* GitHub link */}
                  <a
                    href={issue.github_issue_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-zinc-400 hover:text-emerald-600 transition-colors"
                    title="Open on GitHub"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
