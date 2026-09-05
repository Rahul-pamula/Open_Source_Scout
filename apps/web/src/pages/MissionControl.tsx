import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { IssueCard } from '../components/IssueCard';
import type { ScoutedIssue, NormalizedIssue, TrackedIssue, IssueState } from '../types';
import {
  Loader2,
  Activity,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  XCircle,
  Search,
  Terminal,
  History,
  ShieldAlert,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { DossierPanel } from '../components/DossierPanel';

const STATE_FLOW: IssueState[] = [
  'DISCOVERED',
  'EVALUATED',
  'DRAFTED',
  'ENGAGED',
  'ASSIGNED',
  'COMPLETED',
];

export function MissionControl() {
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
  const [expandedPipelineId, setExpandedPipelineId] = useState<string | null>(null);
  const [verifiedAssignments, setVerifiedAssignments] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'PIPELINE' | 'HISTORY'>('PIPELINE');

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

  const handleStateUpdate = async (id: string, newState: IssueState) => {
    if (!session?.access_token) return;
    try {
      const { error: updateError, data: errData } = await supabase.functions.invoke('tracking', {
        body: { action: 'update_state', id, state: newState },
      });
      if (updateError) {
        throw new Error(errData?.error || updateError.message || 'Failed to update state');
      }
      await fetchPipeline(); // Refresh list
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getAvailableTransitions = (currentState: IssueState): IssueState[] => {
    const transitions: Record<IssueState, IssueState[]> = {
      DISCOVERED: ['EVALUATED', 'REJECTED'],
      EVALUATED: ['DRAFTED', 'ENGAGED', 'REJECTED'],
      DRAFTED: ['ENGAGED', 'REJECTED'],
      ENGAGED: ['ASSIGNED', 'REJECTED'],
      ASSIGNED: ['COMPLETED'],
      COMPLETED: [],
      REJECTED: [],
    };
    return transitions[currentState] || [];
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
      <div className="flex items-center justify-center min-h-[40vh]">
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
            <span
              className={`font-mono text-xs uppercase font-bold ${isDiscovering ? 'text-emerald-600' : 'text-zinc-500'}`}
            >
              {isDiscovering ? 'Scout is working' : 'Scout is idle'}
            </span>
          </div>
          {discoveryStatus ? (
            <span className="font-mono text-[10px] text-zinc-500">{discoveryStatus}</span>
          ) : lastScanTime ? (
            <span className="font-mono text-[10px] text-zinc-400">
              Last scan: {getTimeAgo(lastScanTime)}
            </span>
          ) : null}

          <div className="flex items-center gap-2 mt-2">
            {isSyncing ? (
              <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-600 flex items-center gap-1">
                <Loader2 size={10} className="animate-spin" /> Syncing...
              </span>
            ) : syncStatus.error ? (
              <span
                className="text-[10px] uppercase font-mono tracking-widest text-red-600"
                title={syncStatus.error}
              >
                ⚠ Sync failed
              </span>
            ) : syncStatus.lastSynced ? (
              <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-600">
                ✓ Up to date ({syncStatus.lastSynced})
              </span>
            ) : null}
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="bg-white text-zinc-700 font-bold py-1 px-3 border-2 border-zinc-200 hover:border-zinc-900 hover:text-zinc-900 transition-colors text-xs tracking-widest uppercase disabled:opacity-50"
            >
              Sync GitHub
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] xl:grid-cols-[1fr_400px] gap-8 items-start">
        {/* LEFT COLUMN: MAIN WORKSPACE */}
        <div className="flex flex-col gap-6">
          {/* Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
            <div className="bg-white border border-zinc-200 p-4 flex flex-col shadow-sm">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">
                Active Pipelines
              </span>
              <span className="text-2xl font-mono text-zinc-900">
                {
                  trackedIssues.filter((i) => i.state !== 'COMPLETED' && i.state !== 'REJECTED')
                    .length
                }
              </span>
            </div>
            <div className="bg-white border border-zinc-200 p-4 flex flex-col shadow-sm">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">
                Completed
              </span>
              <span className="text-2xl font-mono text-zinc-900">
                {trackedIssues.filter((i) => i.state === 'COMPLETED').length}
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
              <span className="text-2xl font-mono text-emerald-600">{automationCountToday}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <Terminal size={18} className="text-zinc-400" />
            <h2 className="text-lg font-bold text-zinc-900 uppercase tracking-widest">
              Your Manual Pipeline
            </h2>
          </div>

          {/* Pipeline / History Tabs */}
          <div className="flex border-b border-zinc-200 mt-6">
            <button
              onClick={() => setActiveTab('PIPELINE')}
              className={`pb-2 pr-4 text-sm font-bold tracking-widest uppercase flex items-center gap-2 ${activeTab === 'PIPELINE' ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              <Activity size={16} /> Active Pipeline
              <span className="font-mono text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 ml-1">
                {
                  trackedIssues.filter((i) => i.state !== 'COMPLETED' && i.state !== 'REJECTED')
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

          {trackingError && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 font-mono text-sm">
              [ERROR] {trackingError}
            </div>
          )}

          {isTrackingLoading ? (
            <div className="flex flex-col items-center justify-center py-12 border border-zinc-100">
              <Loader2 className="animate-spin text-zinc-400 mb-4" size={24} />
              <p className="text-zinc-500 font-mono text-xs">Loading...</p>
            </div>
          ) : trackedIssues.length === 0 ? (
            <div className="bg-zinc-50 border border-zinc-200 p-8 text-center text-zinc-500 font-mono text-sm">
              Your pipeline is empty. Save an issue from Scouted Opportunities to start tracking.
            </div>
          ) : (
            <div className="flex flex-col border border-zinc-200 shadow-sm bg-white">
              {/* List Rows */}
              {trackedIssues
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
                            onClick={() => openDossier(issue.github_issue_url)}
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
                                STATE_FLOW.indexOf(issue.state) > index &&
                                issue.state !== 'REJECTED';

                              return (
                                <div
                                  key={state}
                                  className="flex flex-col items-center flex-1 relative group"
                                >
                                  {/* Connecting Line */}
                                  {index < STATE_FLOW.length - 1 && (
                                    <div
                                      className={`absolute top-2.5 left-1/2 w-full h-[2px] -z-10 ${
                                        isPast ? 'bg-emerald-400' : 'bg-zinc-200'
                                      }`}
                                    />
                                  )}

                                  {/* Node */}
                                  <div
                                    className={`w-5 h-5 rounded-full flex items-center justify-center border-2 mb-1.5 ${
                                      isCurrent
                                        ? 'border-emerald-500 bg-emerald-50'
                                        : isPast
                                          ? 'border-emerald-500 bg-emerald-500'
                                          : 'border-zinc-300 bg-white'
                                    }`}
                                  >
                                    {isCurrent && (
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    )}
                                    {isPast && (
                                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                    )}
                                  </div>

                                  {/* Label */}
                                  <span
                                    className={`font-mono text-[8px] uppercase font-bold text-center tracking-widest ${
                                      isCurrent
                                        ? 'text-emerald-700'
                                        : isPast
                                          ? 'text-zinc-700'
                                          : 'text-zinc-400'
                                    }`}
                                  >
                                    {state}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {issue.state === 'REJECTED' && (
                            <div className="flex justify-center mt-1">
                              <span className="font-mono text-[10px] text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 flex items-center gap-1.5">
                                <XCircle size={12} /> ABORTED: REJECTED
                              </span>
                            </div>
                          )}

                          {/* Transition Controls */}
                          {transitions.length > 0 && (
                            <div className="flex flex-col items-center mt-2">
                              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest mb-2">
                                Available Transitions
                              </span>
                              <div className="flex flex-col items-center gap-3">
                                {transitions.map((targetState) => {
                                  const isAssignedTransition = targetState === 'ASSIGNED';
                                  const isVerified = !!verifiedAssignments[issue.id];
                                  return (
                                    <div
                                      key={targetState}
                                      className="flex flex-col items-center w-full"
                                    >
                                      {isAssignedTransition && (
                                        <label className="flex items-center gap-2 mb-2 bg-emerald-50 border border-emerald-200 p-2 text-[10px] font-mono text-emerald-800 cursor-pointer w-full justify-center">
                                          <input
                                            type="checkbox"
                                            checked={isVerified}
                                            onChange={(e) =>
                                              setVerifiedAssignments({
                                                ...verifiedAssignments,
                                                [issue.id]: e.target.checked,
                                              })
                                            }
                                            className="w-3 h-3 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-500 cursor-pointer"
                                          />
                                          I verify the maintainer has assigned me or replied
                                          positively.
                                        </label>
                                      )}
                                      <button
                                        disabled={isAssignedTransition && !isVerified}
                                        onClick={() => handleStateUpdate(issue.id, targetState)}
                                        className={`font-mono text-[10px] font-bold px-3 py-1.5 border shadow-sm transition-transform active:scale-95 w-full max-w-[200px] ${
                                          targetState === 'REJECTED'
                                            ? 'bg-white border-red-200 text-red-600 hover:bg-red-50'
                                            : isAssignedTransition && !isVerified
                                              ? 'bg-zinc-200 border-zinc-300 text-zinc-400 cursor-not-allowed shadow-none'
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
      </div>

      {/* RIGHT COLUMN: DISCOVERY & AUTOMATION */}
      <div className="flex flex-col gap-8">
        {/* Automation Center */}
        <div className="flex flex-col gap-6">
          {/* Automation Control Panel */}
          <div className="bg-white border-2 border-zinc-900 shadow-[4px_4px_0px_#18181b] p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                🤖 Automation Center
              </h2>
              <span className="font-mono text-[10px] bg-zinc-100 text-zinc-500 px-2 py-1 font-bold">
                {automationCountToday} / 25 TODAY
              </span>
            </div>

            <p className="text-xs text-zinc-600 font-mono">
              Scout will autonomously discover, evaluate, and claim issues on your behalf.
            </p>

            <div className="flex items-center gap-4 bg-yellow-50 border border-yellow-200 p-3">
              <ShieldAlert size={20} className="text-yellow-600 shrink-0" />
              <p className="text-[10px] font-mono text-yellow-800">
                <strong>WARNING:</strong> Excessive automated engagement may trigger GitHub bot
                detection. To protect your account, automation is strictly rate-limited to 25 issues
                per day.
              </p>
            </div>

            {automationError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 font-mono text-xs">
                {automationError}
              </div>
            )}

            <div className="flex items-end gap-4 mt-2">
              <div className="flex flex-col gap-1 w-1/3">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Batch Size
                </label>
                <select
                  value={automationBatchSize}
                  onChange={(e) => setAutomationBatchSize(Number(e.target.value))}
                  className="w-full bg-zinc-50 border border-zinc-300 px-3 py-2 text-sm font-mono focus:border-zinc-900 focus:ring-0 cursor-pointer"
                  disabled={isAutomating}
                >
                  <option value={1}>1 Issue</option>
                  <option value={2}>2 Issues</option>
                  <option value={3}>3 Issues</option>
                  <option value={4}>4 Issues</option>
                  <option value={5}>5 Issues</option>
                </select>
              </div>

              <button
                onClick={handleAutomateProcess}
                disabled={isAutomating || automationCountToday >= 25}
                className={`w-2/3 font-mono text-xs font-bold py-2.5 px-4 border-2 shadow-[2px_2px_0px_#18181b] transition-all flex justify-center items-center gap-2 ${
                  isAutomating || automationCountToday >= 25
                    ? 'bg-zinc-200 border-zinc-300 text-zinc-400 shadow-none cursor-not-allowed'
                    : 'bg-emerald-600 border-zinc-900 text-white hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#18181b] active:translate-x-1 active:translate-y-1 active:shadow-none'
                }`}
              >
                {isAutomating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> RUNNING...
                  </>
                ) : automationCountToday >= 25 ? (
                  'LIMIT REACHED'
                ) : (
                  'AUTOMATE PROCESS'
                )}
              </button>
            </div>
          </div>

          {/* Automated Activity Feed */}
          <div className="bg-zinc-50 border border-zinc-200 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                <Activity
                  size={14}
                  className={isAutomating ? 'text-emerald-500 animate-pulse' : 'text-zinc-400'}
                />
                Automated Activity
              </h3>
            </div>
            <div className="flex flex-col gap-3">
              {trackedIssues.length === 0 ? (
                <p className="text-[10px] font-mono text-zinc-400 italic">
                  No automated activity yet.
                </p>
              ) : (
                trackedIssues.slice(0, 5).map((issue, idx) => (
                  <div key={'auto-' + issue.id + '-' + idx} className="flex gap-2 items-start">
                    <div className="mt-0.5 relative flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      {idx !== Math.min(trackedIssues.length, 5) - 1 && (
                        <div className="absolute top-2 w-px h-6 bg-zinc-200"></div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-700 capitalize">
                        {issue.state.toLowerCase()}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 truncate w-56">
                        {issue.repo_name} #{issue.github_issue_url.split('/').pop()}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-zinc-400 ml-auto whitespace-nowrap">
                      {new Date(issue.updated_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Scouted Opportunities */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Search size={16} /> Scouted Opportunities
            </h2>
            <button
              onClick={handleDiscover}
              disabled={isDiscovering}
              className="text-xs font-mono border border-zinc-200 bg-white hover:bg-zinc-50 px-3 py-1 font-medium disabled:opacity-50"
            >
              Scan Now
            </button>
          </div>

          {discoveryError && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 font-mono text-sm">
              [ERROR] {discoveryError}
            </div>
          )}

          {scoutedIssues.length === 0 && !isDiscovering && !discoveryError ? (
            <div className="bg-zinc-50 border border-zinc-200 p-8 text-center flex flex-col items-center">
              <p className="text-zinc-500 font-mono text-sm mb-4">
                No new opportunities in your feed.
              </p>
              <button
                onClick={handleDiscover}
                className="bg-emerald-500 text-white font-bold py-2 px-4 shadow-[2px_2px_0px_#18181b] border border-zinc-900 hover:-translate-y-px hover:shadow-[3px_3px_0px_#18181b] transition-all text-xs"
              >
                Trigger Manual Scan
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {scoutedIssues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  onSave={handleSaveToPipeline}
                  onOpenDossier={openDossier}
                />
              ))}
            </div>
          )}
        </div>
      </div>

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
