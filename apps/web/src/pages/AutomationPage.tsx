import { useOutletContext } from 'react-router-dom';
import { Activity, Loader2, AlertTriangle } from 'lucide-react';
import type { MissionControlContextType } from './MissionControlContext';

export function AutomationPage() {
  const ctx = useOutletContext<MissionControlContextType>();

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto">
      {/* Automation Control Panel */}
      <div className="bg-white border-2 border-zinc-900 shadow-[4px_4px_0px_#18181b] p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
            🤖 Automation Center
          </h2>
          <div className="font-mono text-[10px] bg-zinc-100 px-2 py-1 flex items-center gap-2">
            <span
              className={
                ctx.automationCountToday >= 25 ? 'text-red-500 font-bold' : 'text-zinc-600'
              }
            >
              {ctx.automationCountToday} / 25
            </span>
            <span className="text-zinc-400">TODAY</span>
          </div>
        </div>

        <p className="text-xs text-zinc-500 font-mono">
          Scout will autonomously discover, evaluate, and claim issues on your behalf.
        </p>

        <div className="bg-yellow-50 border border-yellow-200 p-3 flex gap-2 items-start text-[10px] text-yellow-800 font-mono">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-yellow-600" />
          <p>
            <strong>WARNING:</strong> Excessive automated engagement may trigger GitHub bot
            detection. To protect your account, automation is strictly rate-limited to 25 issues per
            day.
          </p>
        </div>

        {ctx.automationError && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 font-mono text-[10px]">
            [ERROR] {ctx.automationError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mt-2">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Batch Size
            </label>
            <select
              value={ctx.automationBatchSize}
              onChange={(e) => ctx.setAutomationBatchSize(Number(e.target.value))}
              disabled={ctx.isAutomating || ctx.automationCountToday >= 25}
              className="border border-zinc-300 p-2 text-sm font-mono bg-white outline-none focus:border-emerald-500 disabled:bg-zinc-50 disabled:text-zinc-400"
            >
              <option value={1}>1 Issue</option>
              <option value={2}>2 Issues</option>
              <option value={5}>5 Issues</option>
            </select>
          </div>
          <button
            onClick={ctx.handleAutomateProcess}
            disabled={ctx.isAutomating || ctx.automationCountToday >= 25}
            className="flex-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 disabled:border-zinc-300 text-white font-bold py-2 px-6 border-2 border-emerald-800 shadow-[2px_2px_0px_#065f46] hover:-translate-y-px hover:shadow-[3px_3px_0px_#065f46] disabled:shadow-none disabled:translate-y-0 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
          >
            {ctx.isAutomating ? (
              <>
                <Loader2 size={14} className="animate-spin" /> RUNNING...
              </>
            ) : ctx.automationCountToday >= 25 ? (
              'LIMIT REACHED'
            ) : (
              'AUTOMATE PROCESS'
            )}
          </button>
        </div>
      </div>

      {/* Automated Activity Feed */}
      <div className="bg-white border border-zinc-200 p-6 flex flex-col shadow-sm">
        <div className="flex items-center justify-between mb-6 border-b border-zinc-100 pb-4">
          <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
            <Activity
              size={16}
              className={ctx.isAutomating ? 'text-emerald-500 animate-pulse' : 'text-zinc-400'}
            />
            Automated Activity
          </h3>
        </div>
        <div className="flex flex-col gap-6">
          {ctx.trackedIssues.length === 0 ? (
            <p className="text-[10px] font-mono text-zinc-400 italic">No automated activity yet.</p>
          ) : (
            ctx.trackedIssues.slice(0, 5).map((issue, idx) => (
              <div key={'auto-' + issue.id + '-' + idx} className="flex gap-4 items-start relative">
                <div className="mt-1 relative flex flex-col items-center justify-center z-10">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-200"></div>
                  {idx !== Math.min(ctx.trackedIssues.length, 5) - 1 && (
                    <div className="absolute top-3 w-px h-12 bg-zinc-100"></div>
                  )}
                </div>
                <div className="flex flex-col bg-zinc-50 p-3 rounded-r-md border-l-2 border-emerald-500 flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                      {issue.state}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400 whitespace-nowrap">
                      {new Date(issue.updated_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-zinc-600 truncate">
                    {issue.repo_name} #{issue.github_issue_url.split('/').pop()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
