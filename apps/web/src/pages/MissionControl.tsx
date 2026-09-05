import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import type { ScoutedIssue, TrackedIssue, NormalizedIssue } from '../types';
import { Loader2, Activity, Search, Terminal } from 'lucide-react';
import { useSearchParams, Outlet, Link, useLocation } from 'react-router-dom';
import { DossierPanel } from '../components/DossierPanel';

export function MissionControl() {
  const location = useLocation();
  const { session, user } = useAuth();

  // -- Profile Data --
  const [userProfile, setUserProfile] = useState<{ bio: string; skills: string[] } | null>(null);

  // -- Discovery State (Opportunities) --
  // We use sessionStorage to cache discovered issues so they survive unmounts
  const [scoutedIssues, setScoutedIssues] = useState<ScoutedIssue[]>(() => {
    const cached = sessionStorage.getItem('scout_discovered_issues');
    return cached ? JSON.parse(cached) : [];
  });
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryStatus, setDiscoveryStatus] = useState<string | null>(null);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<number | null>(() => {
    const cached = sessionStorage.getItem('scout_last_scan_time');
    return cached ? parseInt(cached, 10) : null;
  });

  // -- Tracking State (Active Pipeline) --
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ lastSynced: string | null; error: string | null }>(
    {
      lastSynced: null,
      error: null,
    },
  );

  const [trackedIssues, setTrackedIssues] = useState<TrackedIssue[]>([]);
  const [isTrackingLoading, setIsTrackingLoading] = useState(true);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const [automationCountToday, setAutomationCountToday] = useState(0);
  const [automationBatchSize, setAutomationBatchSize] = useState(1);
  const [isAutomating, setIsAutomating] = useState(false);
  const [automationError, setAutomationError] = useState<string | null>(null);

  // Initialization & Profile Fetch
  useEffect(() => {
    let mounted = true;
    if (user) {
      supabase
        .from('users')
        .select('bio, skills, automation_count_today')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (mounted && data) {
            setUserProfile(data);
            setAutomationCountToday(data.automation_count_today || 0);
          }
        });
      fetchPipeline();
    }
    return () => {
      mounted = false;
    };
  }, [user, session]);

  // Save discovered issues to session storage when they update
  useEffect(() => {
    sessionStorage.setItem('scout_discovered_issues', JSON.stringify(scoutedIssues));
    if (lastScanTime) {
      sessionStorage.setItem('scout_last_scan_time', lastScanTime.toString());
    }
  }, [scoutedIssues, lastScanTime]);

  // Auto-trigger discovery if we have a profile, no cached issues, and haven't scanned recently
  const hasAutoScanned = useRef(false);
  useEffect(() => {
    if (userProfile && scoutedIssues.length === 0 && !isDiscovering && !hasAutoScanned.current) {
      const now = Date.now();
      const fifteenMinutes = 15 * 60 * 1000;
      if (!lastScanTime || now - lastScanTime > fifteenMinutes) {
        hasAutoScanned.current = true;
        handleDiscover();
      }
    }
  }, [userProfile, scoutedIssues.length, lastScanTime, isDiscovering]);

  // --- Discovery Logic (Stage 3 Batching) ---
  const handleDiscover = async () => {
    if (isDiscovering) return;
    try {
      setIsDiscovering(true);
      setDiscoveryError(null);
      setDiscoveryStatus('Searching GitHub...');

      const profileStr = userProfile?.bio || 'I am a developer looking for issues.';
      const skillsQuery =
        userProfile && userProfile.skills.length > 0
          ? userProfile.skills.map((s) => `language:${s}`).join(' ')
          : 'language:typescript';
      const dynamicSearchQuery = `is:open is:issue label:"good first issue" ${skillsQuery}`;

      // Step 1: Fetch and Filter
      const { data: searchData, error: searchError } = await supabase.functions.invoke('search', {
        body: { query: dynamicSearchQuery, limit: 10 },
      });

      if (searchError) throw new Error('Failed to fetch from GitHub: ' + searchError.message);

      const rawEligibleIssues: NormalizedIssue[] = searchData.data || [];

      if (rawEligibleIssues.length === 0) {
        setDiscoveryStatus(null);
        setDiscoveryError(
          "Scout couldn't find a strong match yet. Try updating your Agent Directives.",
        );
        setLastScanTime(Date.now());
        setIsDiscovering(false);
        return;
      }

      setDiscoveryStatus('Filtering candidates...');

      const currentTrackedUrls = new Set(trackedIssues.map((t) => t.github_issue_url));
      const newEligibleIssues = rawEligibleIssues.filter(
        (issue) => !currentTrackedUrls.has(issue.url),
      );

      // Limit to 5 for AI evaluation (Frontend guard, backed by hard backend guard)
      const issuesToEvaluate = newEligibleIssues.slice(0, 5);

      if (issuesToEvaluate.length === 0) {
        setDiscoveryStatus(null);
        setDiscoveryError('Found issues, but they are already in your Active Pipeline.');
        setLastScanTime(Date.now());
        setIsDiscovering(false);
        return;
      }

      setDiscoveryStatus(`Analyzing ${issuesToEvaluate.length} promising issues...`);

      // Step 2: Batch Evaluate (Single API Request)
      const { data: evalRes, error: evalReqError } = await supabase.functions.invoke('evaluate', {
        body: { issues: issuesToEvaluate, profile: profileStr },
      });

      if (evalReqError) {
        throw new Error('Batch evaluation failed: ' + evalReqError.message);
      }

      const evalResults = evalRes?.data || [];
      const newlyScouted: ScoutedIssue[] = [];
      let failureCount = 0;

      // Merge results
      for (const issue of issuesToEvaluate) {
        const issueId = issue.id || issue.url;
        const result = evalResults.find((r: any) => r.issueId === issueId);

        if (result && result.success && result.data) {
          newlyScouted.push({ ...issue, evaluation: result.data });
        } else {
          // If evaluation failed for this specific issue, we still keep it but track the failure
          failureCount++;
          newlyScouted.push({ ...issue });
          console.warn(`Evaluation failed for issue ${issueId}:`, result?.error);
        }
      }

      // Sort by match score descending
      newlyScouted.sort(
        (a, b) => (b.evaluation?.matchScore || 0) - (a.evaluation?.matchScore || 0),
      );

      setScoutedIssues(newlyScouted); // Updates UI without clearing existing if it failed before this step

      if (failureCount > 0 && failureCount < issuesToEvaluate.length) {
        setDiscoveryError(
          `Scout successfully analyzed ${issuesToEvaluate.length - failureCount} issues, but ${failureCount} failed to analyze.`,
        );
      } else if (failureCount === issuesToEvaluate.length) {
        setDiscoveryError('Scout found issues, but AI analysis failed for all of them.');
      } else {
        setDiscoveryError(null);
      }

      setDiscoveryStatus(null);
      setLastScanTime(Date.now());
    } catch (err: any) {
      setDiscoveryError(err.message || 'Scout encountered an error during discovery.');
      setDiscoveryStatus(null);
    } finally {
      setIsDiscovering(false);
    }
  };

  // --- Tracking Logic (From Operations) ---
  const fetchPipeline = async () => {
    if (!session?.access_token) return;
    try {
      setIsTrackingLoading(true);
      const { data: resData, error: trackError } = await supabase.functions.invoke('tracking', {
        body: { action: 'list' },
      });
      if (trackError) throw new Error('Failed to fetch tracking data: ' + trackError.message);
      setTrackedIssues(resData.data);
    } catch (err: any) {
      console.error('Failed to load tracking:', err);
      setTrackingError('Failed to load tracking data');
    } finally {
      setIsTrackingLoading(false);
    }
  };

  const handleSync = async () => {
    if (isSyncing || !user) return;

    setIsSyncing(true);
    setSyncStatus({ ...syncStatus, error: null });

    try {
      const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (!profile || !profile.github_handle) {
        throw new Error('Please configure your GitHub handle in settings first.');
      }

      const { error } = await supabase.functions.invoke('sync', {
        body: { profile },
      });

      if (error) throw new Error(error.message);

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setSyncStatus({ lastSynced: now, error: null });

      // Refresh UI with latest data
      await fetchPipeline();
    } catch (err: any) {
      console.error('Sync failed:', err);
      setSyncStatus({ ...syncStatus, error: err.message || 'Sync failed.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAutomateProcess = async () => {
    if (isAutomating || !user || !userProfile) return;

    if (automationCountToday + automationBatchSize > 25) {
      setAutomationError(
        `Cannot exceed 25 automated actions per day. You have ${25 - automationCountToday} left.`,
      );
      return;
    }

    setIsAutomating(true);
    setAutomationError(null);

    try {
      const { error } = await supabase.functions.invoke('worker', {
        body: { userId: user.id, profile: userProfile, count: automationBatchSize },
      });

      if (error) throw new Error(error.message || 'Worker failed to start');

      // Update local count optimistically
      setAutomationCountToday((prev) => prev + automationBatchSize);

      // We don't await the worker, but we wait a few seconds and refresh pipeline
      setTimeout(() => {
        fetchPipeline();
        handleDiscover();
      }, 5000);
    } catch (err: any) {
      setAutomationError(err.message || 'Failed to trigger automation');
    } finally {
      setIsAutomating(false);
    }
  };

  const handleSaveToPipeline = async (issueId: string) => {
    if (!session?.access_token || !user) return;
    const issueToSave = scoutedIssues.find((i) => i.id === issueId);
    if (!issueToSave) return;

    try {
      const { error: trackError } = await supabase.functions.invoke('tracking', {
        body: {
          action: 'save',
          issueData: {
            github_issue_url: issueToSave.url,
            title: issueToSave.title,
            repo_name: issueToSave.repoName,
            match_score: issueToSave.evaluation?.matchScore,
          },
        },
      });

      if (trackError) throw new Error('Failed to save issue: ' + trackError.message);

      // Remove from scouted list and refresh pipeline
      setScoutedIssues((prev) => prev.filter((i) => i.id !== issueId));
      fetchPipeline();
    } catch (err: any) {
      console.error(err);
      alert('Error saving issue. It may already be tracked.');
    }
  };

  // --- URL State (Dossier Side Panel) ---
  const [searchParams, setSearchParams] = useSearchParams();
  const issueParam = searchParams.get('issue'); // expected format: owner/repo/number

  let dossierProps: { owner: string; repo: string; number: string } | null = null;
  if (issueParam) {
    const parts = issueParam.split('/');
    if (parts.length === 3) {
      dossierProps = { owner: parts[0], repo: parts[1], number: parts[2] };
    }
  }

  const closeDossier = () => {
    setSearchParams({}, { replace: true });
  };

  const openDossier = (githubUrl: string) => {
    // Extract owner/repo/number from https://github.com/owner/repo/issues/number
    try {
      const url = new URL(githubUrl);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 4 && parts[2] === 'issues') {
        const [owner, repo, , number] = parts;
        setSearchParams({ issue: `${owner}/${repo}/${number}` });
      } else {
        console.error('Invalid GitHub issue URL format:', githubUrl);
      }
    } catch (e) {
      console.error('Failed to parse GitHub URL:', githubUrl);
    }
  };

  // --- Render ---
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="text-zinc-300 animate-spin mb-4" />
        <p className="text-zinc-500 font-mono">Authentication required.</p>
      </div>
    );
  }

  // Time formatting helper
  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    return `${Math.floor(seconds / 3600)} hours ago`;
  };

  const ctx: import('./MissionControlContext').MissionControlContextType = {
    userProfile,
    scoutedIssues,
    isDiscovering,
    discoveryStatus,
    discoveryError,
    lastScanTime,
    handleDiscover,
    trackedIssues,
    isTrackingLoading,
    trackingError,
    handleSaveToPipeline,
    openDossier,
    isSyncing,
    syncStatus,
    handleSync,
    fetchPipeline,
    automationCountToday,
    automationBatchSize,
    setAutomationBatchSize,
    isAutomating,
    automationError,
    handleAutomateProcess,
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex justify-between items-end mb-8 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 mb-2">Mission Control</h1>
          <p className="text-zinc-600 font-mono text-sm">
            Central dashboard for discovery and autonomous engagement.
          </p>
        </div>

        {/* Agent Status UI */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            {isDiscovering ? (
              <Loader2 size={16} className="text-emerald-500 animate-spin" />
            ) : (
              <Search size={16} className="text-zinc-400" />
            )}
            <span className="font-mono text-xs font-bold text-zinc-500 uppercase tracking-widest">
              {isDiscovering
                ? 'SCOUT IS SCANNING...'
                : isAutomating
                  ? 'SCOUT IS ENGAGING...'
                  : 'SCOUT IS IDLE'}
            </span>
          </div>
          <span className="font-mono text-[10px] text-zinc-400">
            Last scan: {lastScanTime ? getTimeAgo(lastScanTime) : 'Never'}
          </span>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="mt-2 text-[10px] font-mono font-bold border border-zinc-300 px-3 py-1 uppercase tracking-widest hover:bg-zinc-100 disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync GitHub'}
          </button>
        </div>
      </div>

      <div className="mb-8 border-b border-zinc-200 flex gap-6">
        <Link
          to="/app/discovery"
          className={`pb-2 text-sm font-bold tracking-widest uppercase flex items-center gap-2 ${location.pathname.includes('/discovery') ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
        >
          <Search size={16} /> Discovery
        </Link>
        <Link
          to="/app/automation"
          className={`pb-2 text-sm font-bold tracking-widest uppercase flex items-center gap-2 ${location.pathname.includes('/automation') ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
        >
          <Activity size={16} className={isAutomating ? 'text-emerald-500 animate-pulse' : ''} />{' '}
          Automation
        </Link>
        <Link
          to="/app/pipeline"
          className={`pb-2 text-sm font-bold tracking-widest uppercase flex items-center gap-2 ${location.pathname.includes('/pipeline') ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
        >
          <Terminal size={16} /> Pipeline
        </Link>
      </div>

      {/* Main Content Area */}
      <Outlet context={ctx} />

      {/* Dossier Side Panel Overlay */}
      {dossierProps && (
        <DossierPanel
          owner={dossierProps.owner}
          repo={dossierProps.repo}
          number={dossierProps.number}
          onClose={closeDossier}
        />
      )}
    </div>
  );
}
