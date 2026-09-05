import { useOutletContext } from 'react-router-dom';
import { Activity, AlertTriangle, Loader2 } from 'lucide-react';
import type { MissionControlContextType } from './MissionControlContext';
import { IssueCard } from '../components/IssueCard';

export function AutomationPage() {
  const ctx = useOutletContext<MissionControlContextType>();

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header + Stats */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
          <Activity
            size={16}
            className={ctx.isAutomating ? 'text-emerald-500 animate-pulse' : 'text-zinc-400'}
          />
          Automation Center
        </h2>
        <div className="flex items-center gap-3">
          <span
            className={`font-mono text-xs px-2 py-1 border ${ctx.automationCountToday >= 25 ? 'border-red-200 bg-red-50 text-red-600 font-bold' : 'border-zinc-200 bg-zinc-50 text-zinc-500'}`}
          >
            {ctx.automationCountToday} / 25 TODAY
          </span>
        </div>
      </div>

      {/* Rate limit warning */}
      <div className="bg-yellow-50 border border-yellow-200 p-3 flex gap-2 items-start text-[10px] text-yellow-800 font-mono">
        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-yellow-600" />
        <p>
          <strong>WARNING:</strong> Excessive automated engagement may trigger GitHub bot detection.
          To protect your account, automation is strictly rate-limited to 25 issues per day.
        </p>
      </div>

      {ctx.automationError && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3 font-mono text-xs">
          [ERROR] {ctx.automationError}
        </div>
      )}

      {/* Discovered issues to automate */}
      {ctx.scoutedIssues.length === 0 && !ctx.isDiscovering ? (
        <div className="bg-zinc-50 border border-zinc-200 p-8 text-center flex flex-col items-center shadow-sm">
          <p className="text-zinc-500 font-mono text-sm mb-4">
            No discovered issues to automate. Go to Discovery first to find opportunities.
          </p>
          <button
            onClick={ctx.handleDiscover}
            disabled={ctx.isDiscovering}
            className="bg-emerald-500 text-white font-bold py-2 px-4 shadow-[2px_2px_0px_#18181b] border border-zinc-900 hover:-translate-y-px hover:shadow-[3px_3px_0px_#18181b] transition-all text-xs disabled:opacity-50"
          >
            Scan for Issues First
          </button>
        </div>
      ) : ctx.isDiscovering ? (
        <div className="flex flex-col items-center justify-center py-12 border border-zinc-100 bg-white shadow-sm">
          <Loader2 className="animate-spin text-zinc-300 mb-4" size={24} />
          <p className="text-zinc-500 font-mono text-xs">Scanning GitHub...</p>
        </div>
      ) : (
        <>
          {/* Bulk Automate All */}
          <div className="flex items-center justify-between border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-zinc-900">
                Auto-claim {ctx.scoutedIssues.length} discovered issue
                {ctx.scoutedIssues.length !== 1 ? 's' : ''}
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                Scout will post a claim comment on each issue automatically.
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
                  '⚡ AUTOMATE ALL'
                )}
              </button>
            </div>
          </div>

          {/* Issue grid — same as Discovery but with Auto-Claim */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ctx.scoutedIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onClaim={ctx.handleClaimIssue}
                isClaiming={ctx.claimingIssueUrl === issue.url}
                claimLabel="⚡ Auto-Claim"
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
