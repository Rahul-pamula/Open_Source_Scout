import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Activity,
  History,
  Terminal,
  Search,
  ExternalLink,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import type { MissionControlContextType } from './MissionControlContext';
import type { IssueState } from '../types';

const STATE_FLOW: IssueState[] = [
  'DISCOVERED',
  'EVALUATED',
  'DRAFTED',
  'ENGAGED',
  'ASSIGNED',
  'COMPLETED',
];

export function PipelinePage() {
  const ctx = useOutletContext<MissionControlContextType>();
  const [activeTab, setActiveTab] = useState<'PIPELINE' | 'HISTORY'>('PIPELINE');
  const [expandedPipelineId, setExpandedPipelineId] = useState<string | null>(null);

  const getAvailableTransitions = (currentState: string) => {
    switch (currentState) {
      case 'DISCOVERED':
      case 'EVALUATED':
      case 'DRAFTED':
        return ['ENGAGED', 'REJECTED'];
      case 'ENGAGED':
        return ['ASSIGNED', 'REJECTED'];
      case 'ASSIGNED':
        return ['COMPLETED', 'REJECTED'];
      default:
        return [];
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
        <div className="bg-white border border-zinc-200 p-4 flex flex-col shadow-sm">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">
            Active Pipelines
          </span>
          <span className="text-2xl font-mono text-zinc-900">
            {
              ctx.trackedIssues.filter((i) => i.state !== 'COMPLETED' && i.state !== 'REJECTED')
                .length
            }
          </span>
        </div>
        <div className="bg-white border border-zinc-200 p-4 flex flex-col shadow-sm">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">
            Completed
          </span>
          <span className="text-2xl font-mono text-zinc-900">
            {ctx.trackedIssues.filter((i) => i.state === 'COMPLETED').length}
          </span>
        </div>
        <div className="bg-white border border-zinc-200 p-4 flex flex-col shadow-sm">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">
            Automation Limit
          </span>
          <span className="text-2xl font-mono text-zinc-900">
            25 <span className="text-[10px] text-zinc-400">/ DAY</span>
          </span>
        </div>
        <div className="bg-white border border-zinc-200 p-4 flex flex-col shadow-sm">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">
            Automated Today
          </span>
          <span className="text-2xl font-mono text-emerald-600">{ctx.automationCountToday}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <Terminal size={18} className="text-zinc-400" />
        <h2 className="text-lg font-bold text-zinc-900 uppercase tracking-widest">
          Your Manual Pipeline
        </h2>
      </div>

      {/* Pipeline / History Tabs */}
      <div className="flex border-b border-zinc-200">
        <button
          onClick={() => setActiveTab('PIPELINE')}
          className={`pb-2 pr-4 text-sm font-bold tracking-widest uppercase flex items-center gap-2 ${activeTab === 'PIPELINE' ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
        >
          <Activity size={16} /> Active Pipeline
          <span className="font-mono text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 ml-1">
            {
              ctx.trackedIssues.filter((i) => i.state !== 'COMPLETED' && i.state !== 'REJECTED')
                .length
            }
          </span>
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-2 px-4 text-sm font-bold tracking-widest uppercase flex items-center gap-2 ${activeTab === 'HISTORY' ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
        >
          <History size={16} /> Dashboard
        </button>
      </div>

      {ctx.trackingError && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 font-mono text-sm">
          [ERROR] {ctx.trackingError}
        </div>
      )}

      {ctx.isTrackingLoading ? (
        <div className="flex flex-col items-center justify-center py-12 border border-zinc-100 bg-white shadow-sm">
          <Activity className="animate-pulse text-zinc-300 mb-4" size={24} />
          <p className="text-zinc-500 font-mono text-xs">Loading pipeline...</p>
        </div>
      ) : ctx.trackedIssues.length === 0 ? (
        <div className="bg-zinc-50 border border-zinc-200 p-8 text-center text-zinc-500 font-mono text-sm shadow-sm">
          Your pipeline is empty. Save an issue from Scouted Opportunities to start tracking.
        </div>
      ) : (
        <div className="flex flex-col border border-zinc-200 shadow-sm bg-white">
          {/* List Rows */}
          {ctx.trackedIssues
            .filter((issue) =>
              activeTab === 'PIPELINE'
                ? issue.state !== 'COMPLETED' && issue.state !== 'REJECTED'
                : issue.state === 'COMPLETED' ||
                  issue.state === 'ASSIGNED' ||
                  issue.state === 'REJECTED',
            )
            .map((issue) => {
              const isExpanded = expandedPipelineId === issue.id;
              const transitions = getAvailableTransitions(issue.state);
              const issueNumber = issue.github_issue_url.split('/').pop() || '';

              return (
                <div
                  key={issue.id}
                  className="flex flex-col border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors"
                >
                  {/* Main Row */}
                  <div className="grid grid-cols-12 gap-3 p-4 items-center">
                    {/* Title & Metadata */}
                    <div className="col-span-6 flex flex-col gap-1 pr-2">
                      <span
                        className="font-semibold text-sm text-zinc-900 truncate"
                        title={issue.title}
                      >
                        {issue.title}
                      </span>
                      <div className="flex items-center gap-2 font-mono text-[9px] text-zinc-500">
                        <span className="truncate">
                          {issue.repo_name} #{issueNumber}
                        </span>
                        {issue.match_score && (
                          <>
                            <span>·</span>
                            <span
                              className={
                                issue.match_score >= 80 ? 'text-emerald-600 font-bold' : ''
                              }
                            >
                              {issue.match_score}% MATCH
                            </span>
                          </>
                        )}
                      </div>
                      {issue.contribution_checklist && (
                        <div className="flex items-center gap-1 mt-1 text-[9px] font-mono font-bold uppercase text-emerald-600">
                          <Terminal size={10} />
                          {Object.values(issue.contribution_checklist).filter(Boolean).length}/4
                          Checklist
                        </div>
                      )}
                    </div>

                    {/* State Badge */}
                    <div className="col-span-3 flex items-center justify-center">
                      <span
                        className={`font-mono text-[9px] px-2 py-1 border font-bold uppercase tracking-wider ${
                          issue.state === 'COMPLETED'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : issue.state === 'REJECTED'
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : issue.state === 'ASSIGNED' || issue.state === 'ENGAGED'
                                ? 'border-blue-200 bg-blue-50 text-blue-700'
                                : 'border-zinc-200 bg-zinc-50 text-zinc-700'
                        }`}
                      >
                        {issue.state}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-3 flex items-center justify-end gap-2">
                      <button
                        onClick={() => ctx.openDossier(issue.github_issue_url)}
                        className="text-zinc-400 hover:text-zinc-900 transition-colors"
                        title="Open Dossier"
                      >
                        <Search size={14} />
                      </button>
                      <a
                        href={issue.github_issue_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-400 hover:text-emerald-600 transition-colors"
                        title="Open on GitHub"
                      >
                        <ExternalLink size={14} />
                      </a>

                      <button
                        onClick={() => setExpandedPipelineId(isExpanded ? null : issue.id)}
                        className="flex items-center gap-1 font-mono text-[9px] uppercase font-bold text-zinc-500 hover:text-zinc-900 border border-zinc-200 px-1.5 py-1 bg-white hover:bg-zinc-100 transition-colors"
                      >
                        {isExpanded ? 'Close' : 'View'}
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded State Progression Panel */}
                  {isExpanded && (
                    <div className="border-t border-zinc-100 bg-zinc-50/80 p-4 flex flex-col gap-4 inset-shadow-sm animate-in slide-in-from-top-2 fade-in duration-200">
                      {/* Visual State Flow */}
                      <div className="flex items-center justify-between px-2">
                        {STATE_FLOW.map((state, index) => {
                          const isCurrent = issue.state === state;
                          const isPast =
                            STATE_FLOW.indexOf(issue.state) > index && issue.state !== 'REJECTED';

                          return (
                            <div
                              key={state}
                              className="flex flex-col items-center flex-1 relative group"
                            >
                              {/* Connector Line */}
                              {index < STATE_FLOW.length - 1 && (
                                <div
                                  className={`absolute top-2.5 left-1/2 w-full h-px ${
                                    isPast ? 'bg-emerald-300' : 'bg-zinc-200'
                                  }`}
                                />
                              )}

                              {/* State Node */}
                              <div
                                className={`relative z-10 w-5 h-5 flex items-center justify-center border-2 rounded-full mb-1 transition-colors ${
                                  isCurrent
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-600 ring-4 ring-emerald-50'
                                    : isPast
                                      ? 'bg-emerald-500 border-emerald-500 text-white'
                                      : 'bg-white border-zinc-200 text-zinc-300'
                                }`}
                              >
                                {isPast && (
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={3}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                                {isCurrent && (
                                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                )}
                              </div>
                              <span
                                className={`font-mono text-[8px] tracking-widest uppercase mt-1 ${
                                  isCurrent
                                    ? 'text-emerald-700 font-bold'
                                    : isPast
                                      ? 'text-zinc-600'
                                      : 'text-zinc-400'
                                }`}
                              >
                                {state}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Transition Actions */}
                      {transitions.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-zinc-200 flex items-center justify-between">
                          <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                            Available Actions
                          </span>
                          <div className="flex gap-2">
                            {transitions.map((targetState) => {
                              return (
                                <div key={targetState}>
                                  {targetState === 'ASSIGNED' && (
                                    <div className="flex items-center gap-2 mb-2">
                                      <input type="checkbox" id={`verify-${issue.id}`} />
                                      <label
                                        htmlFor={`verify-${issue.id}`}
                                        className="text-[10px] font-mono text-zinc-600"
                                      >
                                        I verify the maintainer assigned me
                                      </label>
                                    </div>
                                  )}
                                  <button
                                    onClick={async () => {
                                      if (targetState === 'ASSIGNED') {
                                        const el = document.getElementById(
                                          `verify-${issue.id}`,
                                        ) as HTMLInputElement;
                                        if (!el?.checked) {
                                          alert(
                                            'You must verify the maintainer replied and assigned you before moving to ASSIGNED state.',
                                          );
                                          return;
                                        }
                                      }
                                      const { supabase } = await import('../services/supabase');
                                      const { error } = await supabase.functions.invoke(
                                        'tracking',
                                        {
                                          body: {
                                            action: 'update_state',
                                            id: issue.id,
                                            state: targetState,
                                          },
                                        },
                                      );
                                      if (!error) {
                                        ctx.fetchPipeline();
                                        setExpandedPipelineId(null);
                                      } else {
                                        alert('Failed to update state: ' + error.message);
                                      }
                                    }}
                                    className={`text-[9px] font-mono font-bold px-3 py-1.5 uppercase tracking-widest border transition-all ${
                                      targetState === 'REJECTED'
                                        ? 'bg-white border-red-200 text-red-600 hover:bg-red-50'
                                        : 'bg-zinc-900 border-zinc-900 text-white shadow-[2px_2px_0px_#10b981] hover:-translate-y-px'
                                    }`}
                                  >
                                    Move to {targetState}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
