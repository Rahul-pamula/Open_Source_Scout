import { useState, useEffect, useRef } from 'react';
import { X, Loader2, ExternalLink, Copy, Check, CheckCircle, Terminal } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { NormalizedIssue, EvaluationResult } from '../types';

interface DossierPanelProps {
  owner: string;
  repo: string;
  number: string;
  onClose: () => void;
}

type DraftState =
  | 'IDLE'
  | 'GENERATING'
  | 'READY'
  | 'EDITING'
  | 'REGENERATING'
  | 'ERROR'
  | 'REVIEWING_POST'
  | 'POSTING'
  | 'POSTED'
  | 'POST_ERROR';

export function DossierPanel({ owner, repo, number, onClose }: DossierPanelProps) {
  const { user } = useAuth();

  const [issue, setIssue] = useState<NormalizedIssue | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState('Fetching GitHub facts...');
  const [githubError, setGithubError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Engagement State
  const [draftState, setDraftState] = useState<DraftState>('IDLE');
  const [draftText, setDraftText] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);

  // Sync State
  const [trackedIssue, setTrackedIssue] = useState<any | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  // Focus management and Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    // Focus panel for accessibility
    if (panelRef.current) panelRef.current.focus();
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let mounted = true;

    const loadDossier = async () => {
      try {
        setIsLoading(true);
        setGithubError(null);
        setAiError(null);

        // 1. Fetch GitHub Facts
        setLoadingStep('Fetching GitHub facts...');
        const { data: issueResData, error: issueError } = await supabase.functions.invoke(
          'dossier',
          {
            body: { action: 'get_issue', owner, repo, number },
          },
        );

        if (issueError) throw new Error('Failed to fetch issue from GitHub');

        const fetchedIssue = issueResData.data;
        if (mounted) setIssue(fetchedIssue);

        // Fetch Tracked Issue from database
        const { data: trackingData } = await supabase.functions.invoke('tracking', {
          body: { action: 'list' },
        });
        if (mounted && trackingData?.data) {
          const matched = trackingData.data.find((i: any) =>
            i.github_issue_url.endsWith(`${owner}/${repo}/issues/${number}`),
          );
          if (matched) {
            setTrackedIssue(matched);
          }
        }

        // 2. Fetch AI Analysis (Independent of GitHub success so it doesn't break facts)
        setLoadingStep('Running Scout AI analysis...');

        // Get user profile first
        let profileStr = 'I am a developer looking for issues.';
        if (user) {
          const { data: profileData } = await supabase
            .from('users')
            .select('bio')
            .eq('id', user.id)
            .maybeSingle();
          if (profileData?.bio) profileStr = profileData.bio;
        }

        const { data: evalResData, error: evalError } = await supabase.functions.invoke(
          'evaluate',
          {
            body: { issue: fetchedIssue, profile: profileStr },
          },
        );

        if (evalError) {
          if (mounted) setAiError(evalError.message || 'Scout analysis failed.');
        } else if (evalResData?.data) {
          if (mounted) setEvaluation(evalResData.data);
        } else {
          if (mounted) setAiError('No analysis returned from Scout.');
        }
      } catch (err: any) {
        if (mounted) setGithubError(err.message || 'Failed to load issue facts.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    if (owner && repo && number) {
      loadDossier();
    }

    return () => {
      mounted = false;
    };
  }, [owner, repo, number, user]);

  const handleCopy = async () => {
    if (issue?.body) {
      await navigator.clipboard.writeText(issue.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const CLAIM_TEMPLATES = [
    {
      id: 'template_1',
      label: 'Request Assignment',
      text: "Hi, is this issue still open? If no one is working on it, I'd love to take it up! Please assign it to me.",
    },
    {
      id: 'template_2',
      label: 'Express Interest',
      text: "Hi, I'm interested in working on this issue. Could you assign it to me?",
    },
  ];

  const handleSelectTemplate = (templateId: string) => {
    const template = CLAIM_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setDraftText(template.text);
      setDraftState('READY');
      setDraftError(null);
    }
  };

  const handlePostComment = async () => {
    if (!draftText.trim()) {
      setDraftError('Comment cannot be empty.');
      setDraftState('POST_ERROR');
      return;
    }

    setDraftState('POSTING');
    setDraftError(null);

    try {
      const { error: postError } = await supabase.functions.invoke('engage', {
        body: {
          owner,
          repo,
          number,
          draft: draftText,
          intent: 'REQUEST_ASSIGNMENT',
        },
      });

      if (postError) {
        throw new Error(postError.message || 'Failed to post comment.');
      }

      // If we reach here, GitHub post was successful!
      // Attempt tracking update
      let trackingSucceeded = false;
      try {
        const { data: trackingData } = await supabase.functions.invoke('tracking', {
          body: { action: 'list' },
        });
        if (trackingData?.data) {
          const tracked = trackingData.data.find((i: any) => i.github_issue_url === issue?.url);
          if (tracked) {
            const { error: trackErr } = await supabase.functions.invoke('tracking', {
              body: { action: 'update_state', id: tracked.id, state: 'ENGAGED' },
            });
            if (!trackErr) trackingSucceeded = true;
          }
        }
      } catch (trackError) {
        console.error('Tracking update failed:', trackError);
      }

      if (!trackingSucceeded) {
        setDraftError(
          "Comment posted successfully, but Scout couldn't update your tracking status.",
        );
      }

      setDraftState('POSTED');
    } catch (err: any) {
      if (err.message.includes('timeout') || err.message.includes('fetch failed')) {
        setDraftError(
          'The request timed out. The comment may already have been posted. Check GitHub before retrying.',
        );
      } else {
        setDraftError(err.message || 'Failed to post comment.');
      }
      setDraftState('POST_ERROR');
    }
  };

  return (
    <>
      {/* Backdrop (mobile only, visible on small screens to obscure main content) */}
      <div
        className="fixed inset-0 bg-black/20 z-40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Side Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dossier-title"
        className="fixed inset-y-0 right-0 z-50 w-full lg:w-[600px] xl:w-[800px] bg-white shadow-2xl flex flex-col border-l border-zinc-200 outline-none transform transition-transform duration-300 ease-in-out"
      >
        {/* Header (Fixed) */}
        <div className="shrink-0 border-b border-zinc-200 p-4 md:p-6 bg-zinc-50 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 font-mono text-xs text-zinc-500">
              <span className="truncate">
                {owner}/{repo}
              </span>
              <span>#{number}</span>
            </div>
            <h2
              id="dossier-title"
              className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 leading-tight truncate"
            >
              {issue?.title || 'Loading...'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900"
            aria-label="Close dossier"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {isLoading && !issue ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400">
              <Loader2 className="animate-spin mb-4" size={32} />
              <p className="font-mono text-sm animate-pulse">{loadingStep}</p>
            </div>
          ) : githubError ? (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 font-mono text-sm">
              [ERROR] {githubError}
            </div>
          ) : issue ? (
            <div className="flex flex-col gap-8 pb-12">
              {/* AI ANALYSIS SECTION */}
              <section aria-labelledby="ai-analysis-heading">
                <div className="flex items-center gap-2 mb-4">
                  <h3
                    id="ai-analysis-heading"
                    className="text-xs font-bold tracking-widest uppercase text-emerald-600"
                  >
                    SCOUT AI ANALYSIS
                  </h3>
                </div>

                {isLoading ? (
                  <div className="bg-emerald-50/50 border border-emerald-100 p-6 flex flex-col items-center justify-center min-h-[160px] text-emerald-600/60">
                    <Loader2 className="animate-spin mb-3" size={24} />
                    <span className="font-mono text-xs">Analyzing issue alignment...</span>
                  </div>
                ) : aiError ? (
                  <div className="bg-zinc-50 border border-zinc-200 p-4 text-zinc-500 font-mono text-sm">
                    {aiError}
                  </div>
                ) : evaluation ? (
                  <div className="bg-white border-2 border-zinc-900 shadow-[4px_4px_0px_#18181b] p-5 flex flex-col gap-5">
                    {/* Match Score & Intent */}
                    <div className="flex justify-between items-end border-b border-zinc-100 pb-4">
                      <div>
                        <span className="block font-mono text-[10px] tracking-widest text-zinc-400 mb-1">
                          ALIGNMENT
                        </span>
                        <span className="text-sm font-bold text-zinc-900">{evaluation.intent}</span>
                      </div>
                      <div className="text-right">
                        <span className="block font-mono text-[10px] tracking-widest text-zinc-400 mb-1">
                          MATCH SCORE
                        </span>
                        <span
                          className={`text-3xl font-bold font-mono leading-none ${
                            evaluation.matchScore >= 80
                              ? 'text-emerald-500'
                              : evaluation.matchScore >= 50
                                ? 'text-yellow-500'
                                : 'text-red-400'
                          }`}
                        >
                          {evaluation.matchScore}%
                        </span>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block font-mono text-[10px] tracking-widest text-zinc-400 mb-1">
                          DIFFICULTY
                        </span>
                        <span className="text-sm font-semibold text-zinc-900 capitalize">
                          {evaluation.difficulty?.toLowerCase() || 'Unknown'}
                        </span>
                      </div>
                      <div>
                        <span className="block font-mono text-[10px] tracking-widest text-zinc-400 mb-1">
                          EFFORT
                        </span>
                        <span className="text-sm font-semibold text-zinc-900">
                          {evaluation.estimatedEffort || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="pt-2 border-t border-zinc-100">
                      <span className="block font-mono text-[10px] tracking-widest text-zinc-400 mb-2">
                        WHY THIS MATCHES
                      </span>
                      <p className="text-sm text-zinc-700 leading-relaxed bg-zinc-50 p-3 border border-zinc-100">
                        {evaluation.explanation}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-50 border border-zinc-200 p-4 text-zinc-500 font-mono text-sm">
                    Not evaluated yet.
                  </div>
                )}
              </section>

              {/* GITHUB FACTS SECTION */}
              <section aria-labelledby="github-facts-heading">
                <div className="flex items-center justify-between mb-4">
                  <h3
                    id="github-facts-heading"
                    className="text-xs font-bold tracking-widest uppercase text-zinc-400"
                  >
                    SOURCE: GITHUB
                  </h3>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 font-bold border uppercase tracking-wider ${
                      issue.state === 'open'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                    }`}
                  >
                    {issue.state}
                  </span>
                </div>

                {/* Labels */}
                {issue.labels.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {issue.labels.map((label) => (
                      <span
                        key={label}
                        className="bg-zinc-100 text-zinc-600 font-mono text-[10px] px-2 py-1 border border-zinc-200"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}

                {/* Markdown Body */}
                <div className="bg-white border border-zinc-200 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 bg-zinc-50">
                    <span className="font-mono text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                      Raw Markdown
                    </span>
                    {issue.body && (
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex items-center justify-center p-1 text-zinc-400 hover:text-zinc-900 transition-colors"
                        title="Copy raw markdown"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>
                  <div className="p-4 md:p-6 overflow-x-auto">
                    {issue.body ? (
                      <div className="whitespace-pre-wrap font-mono text-xs md:text-sm leading-relaxed text-zinc-700">
                        {issue.body}
                      </div>
                    ) : (
                      <p className="text-zinc-500 italic text-sm">
                        No description provided by author.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <a
                    href={issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-bold tracking-widest uppercase text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    View on GitHub <ExternalLink size={14} className="ml-1" />
                  </a>
                </div>
              </section>

              {/* GITHUB ACTIVITY */}
              {trackedIssue &&
                (trackedIssue.github_assignee_login ||
                  (trackedIssue.github_activity && trackedIssue.github_activity.length > 0)) && (
                  <section
                    aria-labelledby="activity-heading"
                    className="pt-6 border-t border-zinc-200"
                  >
                    <h3
                      id="activity-heading"
                      className="text-xs font-bold tracking-widest uppercase text-zinc-400 mb-4"
                    >
                      GITHUB ACTIVITY
                    </h3>
                    <div className="flex flex-col gap-3 font-mono text-xs">
                      {trackedIssue.github_assignee_login && (
                        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 p-2">
                          <span>👤</span>
                          <span>
                            {trackedIssue.github_assignee_login.toLowerCase() ===
                            user?.user_metadata?.github_handle?.toLowerCase()
                              ? 'Assigned to you'
                              : `Assigned to @${trackedIssue.github_assignee_login}`}
                          </span>
                        </div>
                      )}
                      {trackedIssue.github_activity &&
                        trackedIssue.github_activity.map((activity: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-zinc-700 bg-zinc-50 border border-zinc-100 p-2"
                          >
                            <span className="mt-0.5">💬</span>
                            <div className="flex flex-col">
                              <span className="font-bold text-zinc-900">
                                @{activity.author} commented
                              </span>
                              <span className="text-zinc-500 line-clamp-2 mt-1">
                                {activity.body}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </section>
                )}

              {/* CONTRIBUTION CHECKLIST */}
              {trackedIssue &&
                (trackedIssue.state === 'ASSIGNED' || trackedIssue.state === 'ENGAGED') && (
                  <section
                    aria-labelledby="checklist-heading"
                    className="pt-6 border-t border-zinc-200"
                  >
                    <h3
                      id="checklist-heading"
                      className="text-xs font-bold tracking-widest uppercase text-emerald-600 mb-4 flex items-center gap-2"
                    >
                      <Terminal size={14} /> CONTRIBUTION CHECKLIST
                    </h3>
                    <div className="flex flex-col gap-2 font-mono text-xs">
                      {['work_done', 'pr_sent', 'merged', 'issue_closed'].map((key) => {
                        const isChecked = trackedIssue.contribution_checklist?.[key];
                        const labels: any = {
                          work_done: 'Work Done',
                          pr_sent: 'PR Sent',
                          merged: 'Merged',
                          issue_closed: 'Issue Closed',
                        };
                        return (
                          <label
                            key={key}
                            className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200 cursor-pointer hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={!!isChecked}
                              onChange={async (e) => {
                                const updated = {
                                  ...trackedIssue.contribution_checklist,
                                  [key]: e.target.checked,
                                };
                                setTrackedIssue({
                                  ...trackedIssue,
                                  contribution_checklist: updated,
                                });
                                try {
                                  const { error } = await supabase.functions.invoke('tracking', {
                                    body: {
                                      action: 'update_checklist',
                                      id: trackedIssue.id,
                                      checklist: updated,
                                    },
                                  });
                                  if (error) throw error;
                                  if (key === 'merged' && e.target.checked) {
                                    await supabase.functions.invoke('tracking', {
                                      body: {
                                        action: 'update_state',
                                        id: trackedIssue.id,
                                        state: 'COMPLETED',
                                      },
                                    });
                                    setTrackedIssue({
                                      ...trackedIssue,
                                      state: 'COMPLETED',
                                      contribution_checklist: updated,
                                    });
                                  }
                                } catch (err: any) {
                                  console.error('Failed to update checklist:', err);
                                }
                              }}
                              className="w-4 h-4 text-emerald-600 border-zinc-300 rounded focus:ring-emerald-500 cursor-pointer"
                            />
                            <span
                              className={`${isChecked ? 'line-through text-zinc-400' : 'text-zinc-700 font-bold'}`}
                            >
                              {labels[key]}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                )}

              {/* HOW DO YOU WANT TO ENGAGE? */}
              {(!trackedIssue ||
                (trackedIssue.state !== 'ASSIGNED' && trackedIssue.state !== 'COMPLETED')) && (
                <section aria-labelledby="engage-heading" className="pt-6 border-t border-zinc-200">
                  <h3
                    id="engage-heading"
                    className="text-xs font-bold tracking-widest uppercase text-zinc-400 mb-6"
                  >
                    CLAIM THIS ISSUE
                  </h3>

                  {draftState === 'IDLE' ? (
                    <div className="flex flex-col gap-4">
                      <p className="text-sm text-zinc-600 font-mono">
                        Select a message template to claim this issue:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {CLAIM_TEMPLATES.map((template) => (
                          <button
                            key={template.id}
                            onClick={() => handleSelectTemplate(template.id)}
                            className="text-left bg-white border border-zinc-200 p-4 hover:border-zinc-900 hover:shadow-[4px_4px_0px_#18181b] transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 group"
                          >
                            <div className="font-bold text-zinc-900 mb-1 group-hover:text-emerald-600 transition-colors">
                              💬 {template.label}
                            </div>
                            <div className="text-xs text-zinc-500 font-mono line-clamp-2">
                              {template.text}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border-2 border-zinc-900 p-4 shadow-[4px_4px_0px_#18181b] flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-zinc-900">Review & Post Comment</h4>
                          <span className="block font-mono text-[10px] tracking-widest text-emerald-600 mb-1 uppercase">
                            This will post publicly to @{owner}/{repo} #{number}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setDraftState('IDLE');
                            setDraftText('');
                            setDraftError(null);
                          }}
                          className="text-zinc-400 hover:text-zinc-900 transition-colors text-xs font-bold tracking-widest uppercase"
                        >
                          Cancel
                        </button>
                      </div>

                      {draftState === 'READY' ||
                      draftState === 'EDITING' ||
                      draftState === 'REVIEWING_POST' ? (
                        <>
                          {draftError && (
                            <div className="bg-red-50 border border-red-200 text-red-600 p-3 font-mono text-xs">
                              {draftError}
                            </div>
                          )}

                          <div className="flex flex-col gap-2">
                            <textarea
                              value={draftText}
                              onChange={(e) => {
                                setDraftText(e.target.value);
                                if (draftState === 'READY' || draftState === 'REVIEWING_POST')
                                  setDraftState('EDITING');
                              }}
                              className="w-full h-32 p-4 font-mono text-sm border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none resize-y text-zinc-800 bg-white"
                              placeholder="Draft content..."
                              aria-label="Comment Draft Editor"
                            />
                          </div>

                          <div className="flex gap-3 mt-2">
                            <button
                              onClick={handlePostComment}
                              className="w-full bg-emerald-600 text-white font-bold py-3 border border-emerald-700 shadow-[2px_2px_0px_#065f46] hover:-translate-y-px hover:shadow-[3px_3px_0px_#065f46] active:translate-x-px active:translate-y-px active:shadow-none transition-all text-xs tracking-widest uppercase flex justify-center items-center gap-2"
                            >
                              Claim Issue
                            </button>
                          </div>
                        </>
                      ) : draftState === 'POSTING' ? (
                        <div className="bg-zinc-50 border border-zinc-200 p-8 text-center flex flex-col items-center">
                          <Loader2 size={24} className="animate-spin text-zinc-400 mb-4" />
                          <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
                            Posting to GitHub...
                          </p>
                        </div>
                      ) : draftState === 'POST_ERROR' ? (
                        <div className="bg-red-50 border border-red-200 p-6 text-center flex flex-col items-center gap-4">
                          <div className="font-mono text-sm text-red-600">{draftError}</div>
                          <div className="flex gap-3 w-full">
                            <button
                              onClick={() => setDraftState('READY')}
                              className="flex-1 bg-white text-zinc-700 font-bold py-2 border border-zinc-300 hover:bg-zinc-50 text-xs tracking-widest uppercase"
                            >
                              Edit Draft
                            </button>
                            <button
                              onClick={handlePostComment}
                              className="flex-1 bg-red-600 text-white font-bold py-2 border border-red-700 shadow-[2px_2px_0px_#7f1d1d] hover:-translate-y-px hover:shadow-[3px_3px_0px_#7f1d1d] active:translate-x-px active:translate-y-px active:shadow-none transition-all text-xs tracking-widest uppercase"
                            >
                              Try Again
                            </button>
                          </div>
                        </div>
                      ) : draftState === 'POSTED' ? (
                        <div className="bg-emerald-50 border border-emerald-200 p-8 text-center flex flex-col items-center">
                          <CheckCircle size={32} className="text-emerald-500 mb-4" />
                          <h4 className="font-bold text-emerald-900 text-lg mb-2">
                            Comment Posted
                          </h4>
                          <p className="font-mono text-xs text-emerald-700 mb-6">
                            Your comment was posted to <br /> {owner}/{repo}#{number}
                          </p>

                          {draftError && (
                            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 font-mono text-[10px] mb-4 w-full">
                              {draftError}
                            </div>
                          )}

                          <div className="flex gap-3 w-full">
                            <a
                              href={issue?.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex justify-center items-center bg-zinc-900 text-white font-bold py-3 px-4 shadow-[2px_2px_0px_#10b981] border-2 border-zinc-900 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#10b981] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all text-xs tracking-widest uppercase"
                            >
                              View on GitHub <ExternalLink size={14} className="ml-2" />
                            </a>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </section>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
