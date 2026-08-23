import { useState } from 'react';
import { IssueCard } from '../components/IssueCard';
import type { ScoutedIssue, NormalizedIssue } from '../types';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Hardcoded profile and query for Phase 1 (we'll make this dynamic later)
const USER_PROFILE = "I am a full-stack developer with experience in React, TypeScript, Node.js, and Tailwind CSS. I'm looking for frontend or fullstack issues where I can help build UI components or fix bugs.";
const SEARCH_QUERY = 'is:open is:issue label:"good first issue" language:typescript';

export function Radar() {
  const { session, user } = useAuth();
  const [issues, setIssues] = useState<ScoutedIssue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (issueId: string) => {
    if (!session?.access_token || !user) {
      alert('Please log in to save issues.');
      return;
    }
    const issueToSave = issues.find(i => i.id === issueId);
    if (!issueToSave) return;

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
            github_issue_url: issueToSave.url,
            title: issueToSave.title,
            repo_name: issueToSave.repoName,
            match_score: issueToSave.evaluation?.matchScore
          }
        })
      });
      
      if (!res.ok) throw new Error('Failed to save issue');
      // Minimal visual feedback for now
      alert('Issue tracked successfully!');
    } catch (err) {
      console.error(err);
      alert('Error saving issue. It may already be tracked.');
    }
  };

  const handleDiscover = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIssues([]);
      
      // Step 1: Fetch and Filter
      setStatusText('Scouting GitHub for eligible issues...');
      const searchRes = await fetch(`${API_BASE}/api/github/search?q=${encodeURIComponent(SEARCH_QUERY)}&limit=5`);
      if (!searchRes.ok) throw new Error('Failed to fetch from backend API');
      
      const searchData = await searchRes.json();
      const eligibleIssues: NormalizedIssue[] = searchData.data;

      if (eligibleIssues.length === 0) {
        setStatusText('No eligible issues found matching your criteria.');
        setIsLoading(false);
        return;
      }

      setStatusText(`Found ${eligibleIssues.length} eligible issues. Evaluating matches...`);

      // Step 2: Evaluate each issue
      const scoutedIssues: ScoutedIssue[] = [];
      for (const issue of eligibleIssues) {
        try {
          const evalRes = await fetch(`${API_BASE}/api/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ issue, profile: USER_PROFILE })
          });
          
          if (evalRes.ok) {
            const evalData = await evalRes.json();
            scoutedIssues.push({ ...issue, evaluation: evalData.data });
          } else {
             scoutedIssues.push(issue); // Push without eval if it fails
          }
        } catch (e) {
          scoutedIssues.push(issue);
        }
      }

      // Sort by match score descending
      scoutedIssues.sort((a, b) => (b.evaluation?.matchScore || 0) - (a.evaluation?.matchScore || 0));

      setIssues(scoutedIssues);
      setStatusText('');
    } catch (err: any) {
      setError(err.message || 'An error occurred during discovery.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 tracking-tight">Discover Issues</h1>
      <p className="text-zinc-600 mb-8">
        Find issues that match your skills, interests, and contribution goals.
      </p>
      
      <button 
        onClick={handleDiscover}
        disabled={isLoading}
        className="bg-emerald-500 text-white font-bold py-3 px-6 shadow-[4px_4px_0px_#18181b] border-2 border-zinc-900 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#18181b] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all mb-12 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin mr-2" size={20} />
            Scanning...
          </>
        ) : (
          'Discover Issues'
        )}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 mb-8 font-mono text-sm">
          [ERROR] {error}
        </div>
      )}

      {isLoading && statusText && (
        <div className="text-zinc-500 font-mono text-sm animate-pulse mb-8">
          &gt; {statusText}
        </div>
      )}

      {issues.length > 0 && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-end border-b border-zinc-200 pb-2">
            <h2 className="font-semibold text-lg">Recommended for you</h2>
            <span className="text-xs font-mono text-zinc-500 uppercase">Results: {issues.length}</span>
          </div>
          
          {issues.map((issue) => (
            <IssueCard 
              key={issue.id} 
              issue={issue} 
              onSave={handleSave} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
