import { useState, useEffect, useRef } from 'react';
import { X, Loader2, ExternalLink, Copy, Check } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { NormalizedIssue, EvaluationResult } from '../types';

interface DossierPanelProps {
  owner: string;
  repo: string;
  number: string;
  onClose: () => void;
}

export function DossierPanel({ owner, repo, number, onClose }: DossierPanelProps) {
  const { user } = useAuth();
  
  const [issue, setIssue] = useState<NormalizedIssue | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState('Fetching GitHub facts...');
  const [githubError, setGithubError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
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
        const { data: issueResData, error: issueError } = await supabase.functions.invoke('dossier', {
          body: { action: 'get_issue', owner, repo, number }
        });
        
        if (issueError) throw new Error('Failed to fetch from GitHub: ' + issueError.message);
        if (!issueResData?.data) throw new Error('Issue not found on GitHub.');
        
        const fetchedIssue = issueResData.data;
        if (mounted) setIssue(fetchedIssue);

        // 2. Fetch AI Analysis (Independent of GitHub success so it doesn't break facts)
        setLoadingStep('Running Scout AI analysis...');
        
        // Get user profile first
        let profileStr = "I am a developer looking for issues.";
        if (user) {
          const { data: profileData } = await supabase.from('users').select('bio').eq('id', user.id).maybeSingle();
          if (profileData?.bio) profileStr = profileData.bio;
        }

        const { data: evalResData, error: evalError } = await supabase.functions.invoke('evaluate', {
          body: { issue: fetchedIssue, profile: profileStr }
        });

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

    return () => { mounted = false; };
  }, [owner, repo, number, user]);

  const handleCopy = async () => {
    if (issue?.body) {
      await navigator.clipboard.writeText(issue.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
              <span className="truncate">{owner}/{repo}</span>
              <span>#{number}</span>
            </div>
            <h2 id="dossier-title" className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 leading-tight truncate">
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
                  <h3 id="ai-analysis-heading" className="text-xs font-bold tracking-widest uppercase text-emerald-600">
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
                        <span className="block font-mono text-[10px] tracking-widest text-zinc-400 mb-1">ALIGNMENT</span>
                        <span className="text-sm font-bold text-zinc-900">{evaluation.intent}</span>
                      </div>
                      <div className="text-right">
                        <span className="block font-mono text-[10px] tracking-widest text-zinc-400 mb-1">MATCH SCORE</span>
                        <span className={`text-3xl font-bold font-mono leading-none ${
                          evaluation.matchScore >= 80 ? 'text-emerald-500' : 
                          evaluation.matchScore >= 50 ? 'text-yellow-500' : 'text-red-400'
                        }`}>
                          {evaluation.matchScore}%
                        </span>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block font-mono text-[10px] tracking-widest text-zinc-400 mb-1">DIFFICULTY</span>
                        <span className="text-sm font-semibold text-zinc-900 capitalize">{evaluation.difficulty?.toLowerCase() || 'Unknown'}</span>
                      </div>
                      <div>
                        <span className="block font-mono text-[10px] tracking-widest text-zinc-400 mb-1">EFFORT</span>
                        <span className="text-sm font-semibold text-zinc-900">{evaluation.estimatedEffort || 'Unknown'}</span>
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="pt-2 border-t border-zinc-100">
                      <span className="block font-mono text-[10px] tracking-widest text-zinc-400 mb-2">WHY THIS MATCHES</span>
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
                  <h3 id="github-facts-heading" className="text-xs font-bold tracking-widest uppercase text-zinc-400">
                    SOURCE: GITHUB
                  </h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 font-bold border uppercase tracking-wider ${
                    issue.state === 'open' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                  }`}>
                    {issue.state}
                  </span>
                </div>

                {/* Labels */}
                {issue.labels.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {issue.labels.map(label => (
                      <span key={label} className="bg-zinc-100 text-zinc-600 font-mono text-[10px] px-2 py-1 border border-zinc-200">
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
                      <p className="text-zinc-500 italic text-sm">No description provided by author.</p>
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

            </div>
          ) : null}
          
        </div>
      </div>
    </>
  );
}
