import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ExternalLink, Loader2, AlertTriangle, CheckCircle, ShieldAlert, Info } from 'lucide-react';
import type { NormalizedIssue, NormalizedComment, ClaimResult, EvaluationResult } from '../types';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const USER_PROFILE = "I am a full-stack developer with experience in React, TypeScript, Node.js, and Tailwind CSS. I'm looking for frontend or fullstack issues where I can help build UI components or fix bugs.";

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

  const handleTrack = async () => {
    if (!session?.access_token || !user) {
      alert('Please log in to track issues.');
      return;
    }
    if (!issue) return;

    try {
      const res = await fetch(`${API_BASE}/api/tracking/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: user.id,
          issueData: {
            github_issue_url: issue.url,
            title: issue.title,
            repo_name: issue.repoName,
            match_score: evaluation?.matchScore
          }
        })
      });
      
      if (!res.ok) throw new Error('Failed to save issue');
      alert('Issue tracked successfully! Check the Operations board.');
    } catch (err) {
      console.error(err);
      alert('Error saving issue. It may already be tracked.');
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
        const issueRes = await fetch(`${API_BASE}/api/github/issues/${owner}/${repo}/${number}`);
        if (!issueRes.ok) throw new Error('Failed to fetch issue from GitHub');
        const issueData = await issueRes.json();
        const fetchedIssue = issueData.data;
        if (mounted) setIssue(fetchedIssue);

        // 2. Fetch Comments
        setLoadingStep('Retrieving comment thread...');
        const commentsRes = await fetch(`${API_BASE}/api/github/issues/${owner}/${repo}/${number}/comments`);
        let fetchedComments: NormalizedComment[] = [];
        if (commentsRes.ok) {
          const commentsData = await commentsRes.json();
          fetchedComments = commentsData.data;
          if (mounted) setComments(fetchedComments);
        }

        // 3. Parallel AI Analysis: Evaluation + Claim Status
        setLoadingStep('Running Scout AI analysis...');
        
        const [evalRes, claimRes] = await Promise.all([
          fetch(`${API_BASE}/api/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ issue: fetchedIssue, profile: USER_PROFILE })
          }),
          fetch(`${API_BASE}/api/claim-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ issue: fetchedIssue, comments: fetchedComments })
          })
        ]);

        if (evalRes.ok) {
          const evalData = await evalRes.json();
          if (mounted) setEvaluation(evalData.data);
        }
        
        if (claimRes.ok) {
          const claimData = await claimRes.json();
          if (mounted) setClaimResult(claimData.data);
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
          
        </div>
      </div>
    </div>
  );
}
