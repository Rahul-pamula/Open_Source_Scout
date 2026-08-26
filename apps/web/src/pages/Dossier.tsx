import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ExternalLink, Loader2, AlertTriangle, CheckCircle, ShieldAlert, Info } from 'lucide-react';
import type { NormalizedIssue, NormalizedComment, ClaimResult, EvaluationResult } from '../types';
import { useAuth } from '../contexts/AuthContext';

import { supabase } from '../services/supabase';
// User profile will be fetched dynamically

export function Dossier() {
  const { owner, repo, number } = useParams();
  const { session, user } = useAuth();
  
  const [issue, setIssue] = useState<NormalizedIssue | null>(null);
  const [comments, setComments] = useState<NormalizedComment[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState('Initializing dossier...');
  const [error, setError] = useState<string | null>(null);
  
  const [userProfile, setUserProfile] = useState<{ bio: string, skills: string[] } | null>(null);

  // Fetch user profile on load
  useEffect(() => {
    if (user) {
      supabase.from('users').select('bio, skills').eq('id', user.id).single().then(({ data }) => {
        if (data) setUserProfile(data);
      });
    }
  }, [user]);

  // Engagement State
  const [intent, setIntent] = useState<string>('REQUEST_ASSIGNMENT');
  const [draft, setDraft] = useState<string>('');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [engagementState, setEngagementState] = useState<'IDLE' | 'NEEDS_REVIEW' | 'REVIEWED' | 'READY' | 'POSTING' | 'POSTED' | 'FAILED'>('IDLE');
  const [engagementError, setEngagementError] = useState<string | null>(null);

  const handleTrack = async () => {
    if (!session?.access_token || !user) {
      alert('Please log in to track issues.');
      return;
    }
    if (!issue) return;

    try {
      const { error: trackError } = await supabase.functions.invoke('tracking', {
        body: {
          action: 'save',
          issueData: {
            github_issue_url: issue.url,
            title: issue.title,
            repo_name: issue.repoName,
            match_score: evaluation?.matchScore
          }
        }
      });
      
      if (trackError) throw new Error('Failed to save issue: ' + trackError.message);
      alert('Issue tracked successfully! Check the Operations board.');
    } catch (err) {
      console.error(err);
      alert('Error saving issue. It may already be tracked.');
    }
  };

  const handleGenerateDraft = async () => {
    if (!issue) return;
    setIsGeneratingDraft(true);
    setEngagementError(null);
    try {
      const profileStr = userProfile ? userProfile.bio : "I am a developer looking for issues.";
      const { data: resData, error: draftError } = await supabase.functions.invoke('dossier', {
        body: { action: 'generate_draft', issue, comments, profile: profileStr, intent }
      });
      if (draftError) {
        throw new Error(draftError.message || 'Failed to generate draft');
      }
      const data = resData;
      setDraft(data.data.draft);
      setEngagementState('NEEDS_REVIEW');
    } catch (err: any) {
      setEngagementError(err.message);
      setEngagementState('FAILED');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleApprovePost = async () => {
    if (!issue || !session?.access_token || !draft) return;
    setEngagementState('POSTING');
    setEngagementError(null);
    try {
      // 1. Post to GitHub
      const { error: postError, data: resData } = await supabase.functions.invoke('engage', {
        body: { owner, repo, number, draft, intent }
      });
      if (postError) {
        throw new Error(resData?.error || postError.message || 'Failed to post comment to GitHub');
      }
      
      // 2. Update tracking state if it's tracked
      const { data: trackingData, error: trackingError } = await supabase.functions.invoke('tracking', {
        body: { action: 'list' }
      });
      
      if (!trackingError && trackingData?.data) {
        const trackedIssue = trackingData.data.find((i: any) => i.github_issue_url === issue.url);
        if (trackedIssue) {
          await supabase.functions.invoke('tracking', {
            body: { action: 'update_state', id: trackedIssue.id, state: 'ENGAGED' }
          });
        }
      }

      setEngagementState('POSTED');
    } catch (err: any) {
      setEngagementError(err.message);
      setEngagementState('FAILED');
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const fetchDossierData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // 1. Fetch Issue
        setLoadingStep('Fetching GitHub facts...');
        const { data: issueResData, error: issueError } = await supabase.functions.invoke('dossier', {
          body: { action: 'get_issue', owner, repo, number }
        });
        if (issueError) throw new Error('Failed to fetch issue from GitHub: ' + issueError.message);
        const fetchedIssue = issueResData.data;
        if (mounted) setIssue(fetchedIssue);

        // 2. Fetch Comments
        setLoadingStep('Retrieving comment thread...');
        const { data: commentsResData, error: commentsError } = await supabase.functions.invoke('dossier', {
          body: { action: 'get_comments', owner, repo, number }
        });
        let fetchedComments: NormalizedComment[] = [];
        if (!commentsError && commentsResData?.data) {
          fetchedComments = commentsResData.data;
          if (mounted) setComments(fetchedComments);
        }

        // 3. Parallel AI Analysis: Evaluation + Claim Status
        setLoadingStep('Running Scout AI analysis...');
        
        const profileStr = userProfile ? userProfile.bio : "I am a developer looking for issues.";
        const [evalResData, claimResData] = await Promise.all([
          supabase.functions.invoke('evaluate', {
            body: { issue: fetchedIssue, profile: profileStr }
          }),
          supabase.functions.invoke('dossier', {
            body: { action: 'claim_status', issue: fetchedIssue, comments: fetchedComments }
          })
        ]);

        if (!evalResData.error && evalResData.data?.data) {
          if (mounted) setEvaluation(evalResData.data.data);
        }
        
        if (!claimResData.error && claimResData.data?.data) {
          if (mounted) setClaimResult(claimResData.data.data);
        }

      } catch (err: any) {
        if (mounted) setError(err.message || 'An error occurred loading the dossier.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    if (owner && repo && number) {
      fetchDossierData();
    }

    return () => { mounted = false; };
  }, [owner, repo, number]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-zinc-400 mb-4" size={32} />
        <p className="text-zinc-500 font-mono text-sm animate-pulse">{loadingStep}</p>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="max-w-6xl mx-auto">
        <Link to="/" className="text-sm text-zinc-500 hover:text-zinc-900 mb-6 inline-block">← Back to Radar</Link>
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 font-mono text-sm">
          [ERROR] {error || 'Issue not found'}
        </div>
      </div>
    );
  }

  // Determine claim status visual
  const getClaimStatusUI = () => {
    if (!claimResult) return null;
    
    switch (claimResult.claimStatus) {
      case 'NONE':
        return {
          icon: <CheckCircle size={18} className="text-emerald-500" />,
          title: 'No claim detected',
          color: 'border-emerald-200 bg-emerald-50 text-emerald-900'
        };
      case 'INTEREST_EXPRESSED':
        return {
          icon: <Info size={18} className="text-yellow-600" />,
          title: 'Interest expressed',
          color: 'border-yellow-200 bg-yellow-50 text-yellow-900'
        };
      case 'MAINTAINER_ASSIGNED':
        return {
          icon: <ShieldAlert size={18} className="text-red-600" />,
          title: 'Maintainer assigned',
          color: 'border-red-200 bg-red-50 text-red-900'
        };
      case 'UNCERTAIN':
      default:
        return {
          icon: <AlertTriangle size={18} className="text-zinc-500" />,
          title: 'Uncertain',
          color: 'border-zinc-200 bg-zinc-50 text-zinc-700'
        };
    }
  };

  const claimUI = getClaimStatusUI();

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <Link to="/" className="text-sm text-zinc-500 hover:text-zinc-900 mb-6 inline-block">← Back to Radar</Link>
      
      {/* Issue Header */}
      <div className="mb-8 border-b border-zinc-200 pb-8 flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-zinc-500 text-sm">{issue.repoName}</span>
            <span className="font-mono text-zinc-400 text-sm">#{number}</span>
            <span className={`text-xs font-mono px-2 py-0.5 border ${issue.state === 'open' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-zinc-200 bg-zinc-50 text-zinc-600'}`}>
              {issue.state.toUpperCase()}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 leading-tight">
            {issue.title}
          </h1>
        </div>
        
        <div className="flex gap-4 items-center shrink-0">
          <button 
            onClick={handleTrack}
            className="bg-white text-zinc-900 font-bold py-3 px-6 shadow-[4px_4px_0px_#d4d4d8] border-2 border-zinc-900 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#d4d4d8] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all text-sm flex items-center whitespace-nowrap"
          >
            Track Issue
          </button>
          <a 
            href={issue.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-zinc-900 text-white font-bold py-3 px-6 shadow-[4px_4px_0px_#10b981] border-2 border-zinc-900 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#10b981] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all text-sm flex items-center whitespace-nowrap"
          >
            Open on GitHub <ExternalLink size={16} className="ml-2" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        
        {/* Left Column: GitHub Facts */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <section>
            <h2 className="text-xs font-bold text-zinc-400 tracking-widest uppercase mb-4">GitHub Facts</h2>
            
            {/* Labels */}
            {issue.labels.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {issue.labels.map(label => (
                  <span key={label} className="bg-white text-zinc-700 font-mono text-xs px-2 py-1 border border-zinc-200 shadow-sm">
                    {label}
                  </span>
                ))}
              </div>
            )}
            
            {/* Description */}
            <div className="bg-white border border-zinc-200 p-6 shadow-sm prose prose-zinc max-w-none prose-pre:bg-zinc-900 prose-pre:text-zinc-100">
              {issue.body ? (
                <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-zinc-700">{issue.body}</div>
              ) : (
                <p className="text-zinc-500 italic">No description provided.</p>
              )}
            </div>
          </section>

          {/* Comments */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-zinc-400 tracking-widest uppercase">Comments</h2>
              <span className="font-mono text-xs text-zinc-500">{comments.length} items</span>
            </div>
            
            <div className="flex flex-col gap-4">
              {comments.length === 0 ? (
                <div className="border border-dashed border-zinc-200 p-6 text-center text-zinc-500 text-sm">
                  No comments on this issue yet.
                </div>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="bg-white border border-zinc-200 p-4 shadow-sm flex flex-col">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-50">
                      <span className="font-bold text-sm text-zinc-900">@{comment.author}</span>
                      <span className="font-mono text-xs text-zinc-400">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-600">
                      {comment.body}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Scout Analysis */}
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="text-xs font-bold text-emerald-600 tracking-widest uppercase mb-4 flex items-center">
              Scout Analysis
            </h2>
            
            {evaluation ? (
              <div className="bg-white border-2 border-zinc-900 p-6 shadow-[4px_4px_0px_#18181b] flex flex-col gap-6">
                
                {/* Match Score */}
                <div className="flex justify-between items-end">
                  <span className="font-mono text-xs font-bold tracking-widest text-zinc-500">MATCH SCORE</span>
                  <div className={`text-4xl font-bold font-mono ${evaluation.matchScore >= 80 ? 'text-emerald-500' : evaluation.matchScore >= 50 ? 'text-yellow-500' : 'text-red-400'}`}>
                    {evaluation.matchScore}%
                  </div>
                </div>

                <hr className="border-zinc-100" />

                {/* Intent & Difficulty */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block font-mono text-xs text-zinc-400 mb-1">ALIGNMENT</span>
                    <span className="text-sm font-semibold text-zinc-900">{evaluation.intent}</span>
                  </div>
                  <div>
                    <span className="block font-mono text-xs text-zinc-400 mb-1">DIFFICULTY</span>
                    <span className="text-sm font-semibold text-zinc-900 capitalize">{evaluation.difficulty?.toLowerCase()}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block font-mono text-xs text-zinc-400 mb-1">ESTIMATED EFFORT</span>
                    <span className="text-sm font-semibold text-zinc-900">{evaluation.estimatedEffort}</span>
                  </div>
                </div>

                <hr className="border-zinc-100" />

                {/* Explanation */}
                <div>
                  <span className="block font-mono text-xs text-zinc-400 mb-2">WHY THIS MATCHES</span>
                  <p className="text-sm text-zinc-700 leading-relaxed">
                    {evaluation.explanation}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-50 border border-zinc-200 p-6 text-zinc-500 text-sm text-center">
                Analysis unavailable.
              </div>
            )}
          </section>

          {/* Claim Status */}
          {claimUI && claimResult && (
            <section>
              <h2 className="text-xs font-bold text-zinc-400 tracking-widest uppercase mb-4">Claim Status</h2>
              <div className={`border p-4 flex flex-col gap-3 ${claimUI.color}`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  {claimUI.icon}
                  {claimUI.title}
                </div>
                
                {claimResult.claimant && (
                  <div className="font-mono text-xs">
                    <span className="opacity-70">Claimant:</span> @{claimResult.claimant}
                  </div>
                )}
                
                {claimResult.evidence && (
                  <div className="text-xs bg-white/50 p-2 border-l-2 border-current mt-1 italic">
                    "{claimResult.evidence}"
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Engage */}
          <section>
            <h2 className="text-xs font-bold text-zinc-400 tracking-widest uppercase mb-4">Engage</h2>
            <div className="bg-white border border-zinc-200 p-6 shadow-sm flex flex-col gap-4">
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Intent</label>
                <select 
                  className="border border-zinc-300 px-3 py-2 text-sm font-mono focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none bg-white"
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  disabled={isGeneratingDraft || engagementState === 'POSTING'}
                >
                  <option value="REQUEST_ASSIGNMENT">Request Assignment</option>
                  <option value="PROPOSE_SOLUTION">Propose Solution</option>
                  <option value="ASK_CLARIFICATION">Ask Clarification</option>
                  <option value="EXPRESS_INTEREST">Express Interest</option>
                </select>
              </div>

              {engagementError && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-3 font-mono text-xs">
                  [ERROR] {engagementError}
                </div>
              )}

              {engagementState === 'IDLE' || engagementState === 'FAILED' ? (
                <button 
                  onClick={handleGenerateDraft}
                  disabled={isGeneratingDraft}
                  className="bg-zinc-900 text-white font-bold py-3 px-4 shadow-[4px_4px_0px_#d4d4d8] border-2 border-zinc-900 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#d4d4d8] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all text-sm flex items-center justify-center whitespace-nowrap mt-2 disabled:opacity-50"
                >
                  {isGeneratingDraft ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                  {isGeneratingDraft ? 'Generating Draft...' : 'Generate Draft'}
                </button>
              ) : null}

              {(engagementState === 'NEEDS_REVIEW' || engagementState === 'READY' || engagementState === 'POSTING' || engagementState === 'POSTED') && (
                <div className="flex flex-col gap-4 mt-2 border-t border-zinc-100 pt-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase flex justify-between">
                      <span>Draft</span>
                      <span className="font-mono text-zinc-400">{draft.length} chars</span>
                    </label>
                    <textarea 
                      className="border border-zinc-300 p-3 text-sm font-mono min-h-[160px] focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none resize-y text-zinc-700"
                      value={draft}
                      onChange={(e) => {
                        setDraft(e.target.value);
                        setEngagementState('NEEDS_REVIEW');
                      }}
                      disabled={engagementState === 'POSTING' || engagementState === 'POSTED'}
                    />
                  </div>

                  {engagementState === 'NEEDS_REVIEW' && (
                    <div className="flex gap-4">
                      <button 
                        onClick={handleGenerateDraft}
                        className="flex-1 bg-white text-zinc-900 font-bold py-3 px-2 md:px-4 shadow-[4px_4px_0px_#d4d4d8] border-2 border-zinc-900 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#d4d4d8] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all text-xs md:text-sm"
                      >
                        Regenerate
                      </button>
                      <button 
                        onClick={() => setEngagementState('READY')}
                        className="flex-1 bg-zinc-900 text-white font-bold py-3 px-2 md:px-4 shadow-[4px_4px_0px_#10b981] border-2 border-zinc-900 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#10b981] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all text-xs md:text-sm"
                      >
                        Approve Draft
                      </button>
                    </div>
                  )}

                  {engagementState === 'READY' && (
                    <div className="bg-emerald-50 border border-emerald-200 p-4 flex flex-col gap-4">
                      <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                        <ShieldAlert size={18} />
                        Ready to post
                      </div>
                      <p className="font-mono text-xs text-emerald-700">
                        This will post publicly to @{owner}/{repo} #{number}
                      </p>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setEngagementState('NEEDS_REVIEW')}
                          className="flex-1 bg-white text-zinc-700 font-bold py-2 border border-zinc-300 hover:bg-zinc-50 text-xs"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleApprovePost}
                          className="flex-1 bg-emerald-600 text-white font-bold py-2 border border-emerald-700 shadow-[2px_2px_0px_#065f46] hover:-translate-y-px hover:shadow-[3px_3px_0px_#065f46] active:translate-x-px active:translate-y-px active:shadow-none transition-all text-xs"
                        >
                          Post Comment
                        </button>
                      </div>
                    </div>
                  )}

                  {engagementState === 'POSTING' && (
                    <div className="bg-zinc-50 border border-zinc-200 p-4 text-center">
                      <Loader2 size={24} className="animate-spin text-zinc-400 mx-auto mb-2" />
                      <p className="font-mono text-xs text-zinc-500">Posting to GitHub...</p>
                    </div>
                  )}

                  {engagementState === 'POSTED' && (
                    <div className="bg-emerald-50 border border-emerald-200 p-4 text-center flex flex-col items-center">
                      <CheckCircle size={24} className="text-emerald-500 mb-2" />
                      <p className="font-bold text-sm text-emerald-900">Comment Posted!</p>
                      <p className="font-mono text-xs text-emerald-700 mt-1 mb-4">This issue is now ENGAGED.</p>
                      <Link 
                        to="/app/operations"
                        className="bg-emerald-600 text-white font-bold px-4 py-2 border border-emerald-700 shadow-[2px_2px_0px_#065f46] hover:-translate-y-px hover:shadow-[3px_3px_0px_#065f46] active:translate-x-px active:translate-y-px active:shadow-none transition-all text-xs"
                      >
                        Return to Operations
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
          
        </div>
      </div>
    </div>
  );
}
