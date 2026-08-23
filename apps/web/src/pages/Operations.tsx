import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ExternalLink, ChevronDown, ChevronRight, Activity, XCircle } from 'lucide-react';
import type { TrackedIssue, IssueState } from '../types';

import { supabase } from '../services/supabase';

const STATE_FLOW: IssueState[] = ['DISCOVERED', 'EVALUATED', 'DRAFTED', 'ENGAGED', 'ASSIGNED', 'COMPLETED'];

export function Operations() {
  const { session } = useAuth();
  const [issues, setIssues] = useState<TrackedIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchIssues();
  }, [session]);

  const fetchIssues = async () => {
    if (!session?.access_token) return;
    try {
      setIsLoading(true);
      const { data: resData, error: trackError } = await supabase.functions.invoke('tracking', {
        body: { action: 'list' }
      });
      if (trackError) throw new Error('Failed to fetch tracking data: ' + trackError.message);
      const data = resData;
      setIssues(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStateUpdate = async (id: string, newState: IssueState) => {
    if (!session?.access_token) return;
    try {
      const { error: updateError, data: errData } = await supabase.functions.invoke('tracking', {
        body: { action: 'update_state', id, state: newState }
      });
      if (updateError) {
        throw new Error(errData?.error || updateError.message || 'Failed to update state');
      }
      await fetchIssues(); // Refresh list
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getAvailableTransitions = (currentState: IssueState): IssueState[] => {
    const transitions: Record<IssueState, IssueState[]> = {
      'DISCOVERED': ['EVALUATED', 'REJECTED'],
      'EVALUATED': ['DRAFTED', 'ENGAGED', 'REJECTED'],
      'DRAFTED': ['ENGAGED', 'REJECTED'],
      'ENGAGED': ['ASSIGNED', 'REJECTED'],
      'ASSIGNED': ['COMPLETED'],
      'COMPLETED': [],
      'REJECTED': []
    };
    return transitions[currentState] || [];
  };

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[40vh]">
        <p className="text-zinc-500 font-mono">Authentication required.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="flex justify-between items-end mb-8 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 mb-2">Operations</h1>
          <p className="text-zinc-600 font-mono text-sm">
            Contribution Tracking & State Management
          </p>
        </div>
        <div className="font-mono text-xs text-zinc-500 uppercase flex items-center gap-2">
          <Activity size={14} className="text-emerald-500" />
          Active Pipeline: {issues.filter(i => i.state !== 'COMPLETED' && i.state !== 'REJECTED').length}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 mb-8 font-mono text-sm">
          [ERROR] {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="animate-spin text-zinc-400 mb-4" size={24} />
          <p className="text-zinc-500 font-mono text-xs">Synchronizing state...</p>
        </div>
      ) : issues.length === 0 ? (
        <div className="bg-zinc-50 border border-zinc-200 p-8 text-center text-zinc-500 font-mono text-sm">
          No operations tracked. Head to the Radar to discover issues.
        </div>
      ) : (
        <div className="flex flex-col border border-zinc-200 shadow-sm bg-white">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-200 bg-zinc-50 font-mono text-xs font-bold text-zinc-500 uppercase tracking-wider">
            <div className="col-span-1">ID</div>
            <div className="col-span-5">Issue</div>
            <div className="col-span-3">State</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>

          {/* List Rows */}
          {issues.map(issue => {
            const isExpanded = expandedId === issue.id;
            const transitions = getAvailableTransitions(issue.state);
            const issueNumber = issue.github_issue_url.split('/').pop() || '';

            return (
              <div key={issue.id} className="flex flex-col border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors">
                
                {/* Main Row */}
                <div className="grid grid-cols-12 gap-4 p-4 items-center">
                  
                  {/* ID & Repo */}
                  <div className="col-span-1 flex flex-col items-start gap-1">
                    <span className="font-mono text-xs text-zinc-900 font-bold">#{issueNumber}</span>
                  </div>

                  {/* Title & Metadata */}
                  <div className="col-span-5 flex flex-col gap-1 pr-4">
                    <span className="font-semibold text-zinc-900 truncate" title={issue.title}>
                      {issue.title}
                    </span>
                    <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500">
                      <span className="truncate">{issue.repo_name}</span>
                      <span>·</span>
                      <span className={issue.match_score && issue.match_score >= 80 ? 'text-emerald-600 font-bold' : ''}>
                        {issue.match_score ? `${issue.match_score}%` : 'N/A'}
                      </span>
                      <span>·</span>
                      <span>{new Date(issue.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* State Badge */}
                  <div className="col-span-3 flex items-center">
                    <span className={`font-mono text-[10px] px-2 py-1 border font-bold uppercase tracking-wider ${
                      issue.state === 'COMPLETED' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                      issue.state === 'REJECTED' ? 'border-red-200 bg-red-50 text-red-700' :
                      issue.state === 'ASSIGNED' || issue.state === 'ENGAGED' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                      'border-zinc-200 bg-zinc-50 text-zinc-700'
                    }`}>
                      {issue.state}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-3 flex items-center justify-end gap-3">
                    <a 
                      href={issue.github_issue_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-emerald-600 transition-colors"
                      title="Open on GitHub"
                    >
                      <ExternalLink size={16} />
                    </a>
                    
                    <button 
                      onClick={() => setExpandedId(isExpanded ? null : issue.id)}
                      className="flex items-center gap-1 font-mono text-[10px] uppercase font-bold text-zinc-500 hover:text-zinc-900 border border-zinc-200 px-2 py-1 bg-white hover:bg-zinc-100 transition-colors"
                    >
                      {isExpanded ? 'Close' : 'Update'} 
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  </div>
                </div>

                {/* Expanded State Progression Panel */}
                {isExpanded && (
                  <div className="border-t border-zinc-100 bg-zinc-50/80 p-6 flex flex-col gap-6 inset-shadow-sm">
                    
                    {/* Visual State Flow */}
                    <div className="flex items-center justify-between px-4">
                      {STATE_FLOW.map((state, index) => {
                        const isCurrent = issue.state === state;
                        const isPast = STATE_FLOW.indexOf(issue.state) > index && issue.state !== 'REJECTED';

                        return (
                          <div key={state} className="flex flex-col items-center flex-1 relative group">
                            {/* Connecting Line */}
                            {index < STATE_FLOW.length - 1 && (
                              <div className={`absolute top-3 left-1/2 w-full h-[2px] -z-10 ${
                                isPast ? 'bg-emerald-400' : 'bg-zinc-200'
                              }`} />
                            )}
                            
                            {/* Node */}
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 mb-2 ${
                              isCurrent ? 'border-emerald-500 bg-emerald-50' : 
                              isPast ? 'border-emerald-500 bg-emerald-500' :
                              'border-zinc-300 bg-white'
                            }`}>
                              {isCurrent && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                              {isPast && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            
                            {/* Label */}
                            <span className={`font-mono text-[9px] uppercase font-bold text-center tracking-widest ${
                              isCurrent ? 'text-emerald-700' :
                              isPast ? 'text-zinc-700' :
                              'text-zinc-400'
                            }`}>
                              {state}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {issue.state === 'REJECTED' && (
                      <div className="flex justify-center mt-2">
                        <span className="font-mono text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1 flex items-center gap-2">
                          <XCircle size={14} /> ABORTED: REJECTED
                        </span>
                      </div>
                    )}

                    {/* Transition Controls */}
                    {transitions.length > 0 && (
                      <div className="flex flex-col items-center mt-4">
                        <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Available Transitions</span>
                        <div className="flex gap-3">
                          {transitions.map(targetState => (
                            <button
                              key={targetState}
                              onClick={() => handleStateUpdate(issue.id, targetState)}
                              className={`font-mono text-xs font-bold px-4 py-2 border shadow-sm transition-transform active:scale-95 ${
                                targetState === 'REJECTED' 
                                  ? 'bg-white border-red-200 text-red-600 hover:bg-red-50'
                                  : 'bg-zinc-900 border-zinc-900 text-white shadow-[2px_2px_0px_#10b981] hover:-translate-y-0.5'
                              }`}
                            >
                              Move to {targetState}
                            </button>
                          ))}
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
