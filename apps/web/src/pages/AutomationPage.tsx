import { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Activity, AlertTriangle, ExternalLink, Loader2, Zap, Plus } from 'lucide-react';
import type { MissionControlContextType } from './MissionControlContext';
import { IssueCardSkeleton } from '../components/IssueCard';
import type { TrackedIssue } from '../types';
import { supabase } from '../services/supabase';

function ClaimedCard({
  issue,
  isPending,
  onMakeAssigned,
  onMarkNotAssigned,
}: {
  issue: TrackedIssue;
  isPending?: boolean;
  onMakeAssigned: () => void;
  onMarkNotAssigned: () => void;
}) {
  const issueNumber = issue.github_issue_url.split('/').pop();
  const claimedVia = (issue as any).claimed_via || 'AUTO';
  const isManual = claimedVia === 'MANUAL';
  const isExternal = claimedVia === 'EXTERNAL';

  return (
    <div className="bg-white border border-zinc-200 p-6 flex flex-col transition-shadow hover:shadow-md">
      {/* Header: Claimed badge */}
      <div className="flex justify-between items-start mb-4 pb-4 border-b border-zinc-100">
        <span
          className={`font-mono text-xs font-bold tracking-widest px-2 py-1 border ${
            isManual
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : isExternal
                ? 'border-purple-200 bg-purple-50 text-purple-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {isManual
            ? '🤚 CLAIMED MANUALLY'
            : isExternal
              ? '🔗 SOURCE: EXTERNAL'
              : '⚡ CLAIMED BY AUTO'}
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
            disabled={isPending}
            className="bg-emerald-500 text-white font-bold py-2 px-4 shadow-[4px_4px_0px_#059669] border-2 border-emerald-600 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#059669] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all text-sm disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : '✅'}
            {isPending ? 'Updating...' : 'Make Assigned'}
          </button>
        </div>
        <button
          onClick={onMarkNotAssigned}
          disabled={isPending}
          className="text-zinc-400 hover:text-red-500 transition-colors text-xs font-mono font-bold uppercase tracking-wider flex items-center disabled:opacity-50 disabled:pointer-events-none"
        >
          {isPending ? 'Updating...' : 'Drop / Close'}
        </button>
      </div>
    </div>
  );
}

export function AutomationPage() {
  const ctx = useOutletContext<MissionControlContextType>();
  const claimedIssues = ctx.trackedIssues.filter((i) => i.state === 'ENGAGED');

  const [showExternalInput, setShowExternalInput] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [isAddingExternal, setIsAddingExternal] = useState(false);
  const [externalError, setExternalError] = useState<string | null>(null);

  const handleAddExternal = async () => {
    setExternalError(null);
    if (!externalUrl.trim()) return;

    const urlPattern = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)$/;
    if (!urlPattern.test(externalUrl.trim())) {
      setExternalError(
        'Invalid GitHub issue URL. Format: https://github.com/owner/repo/issues/123',
      );
      return;
    }

    setIsAddingExternal(true);
    try {
      const { error } = await supabase.functions.invoke('tracking', {
        body: { action: 'fetch_and_save', github_url: externalUrl.trim() },
      });

      if (error) {
        let msg = error.message;
        if (error.context && typeof error.context.json === 'function') {
          const errBody = await error.context.json().catch(() => null);
          if (errBody?.error) msg = errBody.error;
        }
        throw new Error(msg);
      }

      setExternalUrl('');
      setShowExternalInput(false);
      await ctx.fetchPipeline(); // Refresh pipeline immediately
    } catch (err: any) {
      console.error('Failed to add external issue:', err);
      setExternalError(err.message || 'Failed to add external issue.');
    } finally {
      setIsAddingExternal(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-12">
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

      {/* Actions control bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border border-zinc-200 bg-white p-4 shadow-sm gap-4">
        {/* Automate from Discovery */}
        <div className="flex items-center justify-between flex-1 md:border-r border-zinc-200 md:pr-4">
          <div className="flex flex-col gap-0.5 mr-4">
            <span className="text-sm font-bold text-zinc-900">Auto-claim from Discovery</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={ctx.automationBatchSize}
              onChange={(e) => ctx.setAutomationBatchSize(Number(e.target.value))}
              disabled={ctx.isAutomating || ctx.automationCountToday >= 25}
              className="border border-zinc-300 p-1.5 text-[10px] font-mono bg-white outline-none focus:border-emerald-500 disabled:bg-zinc-50 disabled:text-zinc-400"
            >
              <option value={1}>1 Issue</option>
              <option value={2}>2 Issues</option>
              <option value={5}>5 Issues</option>
            </select>
            <button
              onClick={ctx.handleAutomateProcess}
              disabled={ctx.isAutomating || ctx.automationCountToday >= 25}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 text-white font-bold py-1.5 px-3 border-2 border-emerald-800 shadow-[2px_2px_0px_#065f46] hover:-translate-y-px hover:shadow-[3px_3px_0px_#065f46] disabled:shadow-none disabled:translate-y-0 disabled:border-zinc-300 transition-all uppercase tracking-widest text-[10px] flex items-center gap-1"
            >
              {ctx.isAutomating ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Zap size={12} />
              )}
              {ctx.isAutomating ? 'RUNNING...' : 'AUTOMATE'}
            </button>
          </div>
        </div>

        {/* Add External Issue */}
        <div className="flex items-center justify-between flex-1 md:pl-4">
          <div className="flex flex-col gap-0.5 mr-4">
            <span className="text-sm font-bold text-zinc-900">External Issue</span>
          </div>
          <button
            onClick={() => setShowExternalInput(!showExternalInput)}
            className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-1.5 px-3 border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] hover:-translate-y-px hover:shadow-[3px_3px_0px_#18181b] transition-all uppercase tracking-widest text-[10px] flex items-center gap-1 shrink-0"
          >
            <Plus size={12} /> ADD EXTERNAL ISSUE
          </button>
        </div>
      </div>

      {/* External Input Form */}
      {showExternalInput && (
        <div className="bg-zinc-50 border border-zinc-200 p-4 -mt-4 animate-fade-in-up">
          <p className="text-zinc-600 text-sm font-mono mb-3">
            Add an issue you found yourself. Scout will fetch the details and add it to your claimed
            pipeline.
          </p>
          {externalError && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-2 text-xs font-mono mb-3">
              {externalError}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="https://github.com/owner/repo/issues/123"
              className="flex-1 border border-zinc-300 p-2 font-mono text-sm focus:border-zinc-900 focus:outline-none"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              disabled={isAddingExternal}
            />
            <button
              onClick={handleAddExternal}
              disabled={isAddingExternal || !externalUrl.trim()}
              className="bg-zinc-900 text-white font-bold px-6 py-2 disabled:opacity-50 flex items-center transition-opacity text-sm font-mono uppercase tracking-widest"
            >
              {isAddingExternal ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
              {isAddingExternal ? 'Fetching...' : 'Add Issue'}
            </button>
          </div>
        </div>
      )}

      {/* Claimed issues grid */}
      {ctx.isTrackingLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <IssueCardSkeleton key={i} />
          ))}
        </div>
      ) : claimedIssues.length === 0 ? (
        <div className="bg-zinc-50 border-2 border-dashed border-zinc-200 p-12 text-center flex flex-col items-center">
          <div className="bg-white p-3 rounded-full shadow-sm border border-zinc-200 mb-4 text-zinc-400">
            <Activity size={24} />
          </div>
          <p className="text-zinc-500 text-sm font-mono mb-6 max-w-md">
            No claimed issues yet. Claim an issue from Discovery or add an external GitHub issue.
          </p>
          <div className="flex items-center gap-4">
            <Link
              to="/app/discovery"
              className="bg-white text-zinc-900 font-bold py-2 px-6 border border-zinc-200 shadow-sm hover:bg-zinc-50 transition-colors text-sm"
            >
              Discover Issues
            </Link>
            <button
              onClick={() => setShowExternalInput(true)}
              className="text-zinc-600 font-bold hover:text-zinc-900 transition-colors text-sm underline underline-offset-4 decoration-zinc-300 hover:decoration-zinc-900"
            >
              + Add External Issue
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {claimedIssues.map((issue) => (
            <ClaimedCard
              key={issue.id}
              issue={issue}
              isPending={!!ctx.pendingIssues[issue.id]}
              onMakeAssigned={() => ctx.handleUpdateState(issue.id, 'ASSIGNED')}
              onMarkNotAssigned={() => ctx.handleUpdateState(issue.id, 'REJECTED')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
