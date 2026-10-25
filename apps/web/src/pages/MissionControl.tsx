import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import type { Task } from '../types';
import {
  Loader2,
  Activity,
  Search,
  Terminal,
  Eye,
  PartyPopper,
  CheckCircle2,
  XCircle,
  ArchiveX,
} from 'lucide-react';
import { useSearchParams, Outlet, Link, useLocation } from 'react-router-dom';
import { DossierPanel } from '../components/DossierPanel';
import { useIssueDiscovery } from '../hooks/useIssueDiscovery';
import type { ExperienceLevel } from '../types/user';

type Toast = { id: number; type: 'success' | 'error'; message: string };

export function MissionControl() {
  const location = useLocation();
  const { session, user, userProfile: authProfile } = useAuth();

  // -- Profile Data --
  const [userProfile, setUserProfile] = useState<{
    bio: string;
    skills: string[];
    experience_level?: ExperienceLevel;
  } | null>(null);

  // -- Tracking State (Active Pipeline) --
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ lastSynced: string | null; error: string | null }>(
    {
      lastSynced: null,
      error: null,
    },
  );

  const [trackedIssues, setTasks] = useState<Task[]>([]);
  const [isTrackingLoading, setIsTrackingLoading] = useState(true);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const [pendingIssues, setPendingIssues] = useState<Record<string, number>>({});
  const pendingIssuesRef = useRef<Record<string, number>>({});
  const pipelineVersionRef = useRef(0);

  const setIssuePending = (id: string, reqId: number | null) => {
    setPendingIssues((prev) => {
      const next = { ...prev };
      if (reqId === null) {
        delete next[id];
      } else {
        next[id] = reqId;
      }
      pendingIssuesRef.current = next;
      return next;
    });
    pipelineVersionRef.current += 1;
  };

  const [automationCountToday, setAutomationCountToday] = useState(0);
  const [automationBatchSize, setAutomationBatchSize] = useState(1);
  const [isAutomating, setIsAutomating] = useState(false);
  const [automationError, setAutomationError] = useState<string | null>(null);

  // -- Toast Notifications --
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  // Initialization & Profile Fetch — runs only when user ID changes (login/logout)
  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    supabase
      .from('users')
      .select(
        'bio, skills, automation_count_today, last_automation_date, github_handle, experience_level',
      )
      .eq('id', user.id)
      .maybeSingle()
      .then(
        ({
          data,
        }: {
          data: {
            bio: string;
            skills: string[];
            automation_count_today: number;
            last_automation_date: string;
            github_handle: string;
            experience_level?: ExperienceLevel;
          } | null;
        }) => {
          if (mounted && data) {
            setUserProfile(data);
            // Reset count if it's a new day
            const today = new Date().toISOString().split('T')[0];
            const lastDate = data.last_automation_date || '';
            if (lastDate !== today) {
              setAutomationCountToday(0);
              supabase
                .from('users')
                .update({ automation_count_today: 0, last_automation_date: today })
                .eq('id', user.id);
            } else {
              setAutomationCountToday(data.automation_count_today || 0);
            }
          }
        },
      );
    fetchPipeline();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // -- Discovery Hook (Encapsulated Query, Relaxation & Telemetry) --
  const {
    scoutedIssues,
    setScoutedIssues,
    isDiscovering,
    discoveryStatus,
    discoveryError,
    lastScanTime,
    activeQueryTelemetry,
    handleDiscover,
  } = useIssueDiscovery({
    userProfile,
    authExperienceLevel: authProfile?.experience_level,
    authSkills: authProfile?.skills,
    trackedIssues,
    onNotify: showToast,
  });

  // --- Claim Issue (post default message, no AI) ---
  const [claimingIssueUrl, setClaimingIssueUrl] = useState<string | null>(null);

  const handleClaimIssue = async (githubUrl: string) => {
    if (claimingIssueUrl) return;
    try {
      setClaimingIssueUrl(githubUrl);
      const url = new URL(githubUrl);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length < 4 || parts[2] !== 'issues') {
        throw new Error('Invalid GitHub issue URL');
      }
      const [owner, repo, , number] = parts;

      const githubHandle = (userProfile as any)?.github_handle || 'developer';
      const defaultMessage = `Hi! I'd love to work on this issue. I'm @${githubHandle} and I have experience with the relevant tech stack. Could I be assigned this one? I'll have a fix ready soon! 🙌`;

      // 1. Secure the Lock: Save to pipeline directly as DRAFTED first
      const { data: savedData, error: trackingError } = await supabase.functions.invoke(
        'tracking',
        {
          body: {
            action: 'save',
            issueData: {
              external_url: githubUrl,
              github_issue_url: githubUrl,
              external_id: number || githubUrl.split('/').pop() || '',
              platform: 'github',
              title: scoutedIssues.find((i) => i.url === githubUrl)?.title || '',
              repo_name: `${owner}/${repo}`,
              match_score: scoutedIssues.find((i) => i.url === githubUrl)?.evaluation?.matchScore,
              claimed_via: 'MANUAL',
              initial_state: 'DRAFTED', // secure lock in DRAFTED before engaging
            },
          },
        },
      );

      if (trackingError) {
        let actualErrorMessage = trackingError.message;
        try {
          if (trackingError.context && typeof trackingError.context.json === 'function') {
            const errBody = await trackingError.context.json();
            if (errBody && errBody.error) {
              actualErrorMessage = errBody.error;
            }
          }
        } catch (e) {}
        throw new Error(`Tracking save failed: ${actualErrorMessage}`);
      }

      const trackedId = savedData?.data?.id;

      // The issue is now successfully tracked in the DB.
      // Remove it from the discovery list immediately so it doesn't get stuck if engage fails.
      setScoutedIssues((prev) => prev.filter((i) => i.url !== githubUrl));
      sessionStorage.setItem(
        'scout_discovered_issues',
        JSON.stringify(scoutedIssues.filter((i) => i.url !== githubUrl)),
      );
      // Fire-and-forget fetch to update the pipeline tabs in the background
      fetchPipeline();

      // 2. Execute Engagement (Post to GitHub)
      const { error: engageError } = await supabase.functions.invoke('engage', {
        body: {
          owner,
          repo,
          number: parseInt(number),
          draft: defaultMessage,
          intent: 'REQUEST_ASSIGNMENT',
        },
      });

      if (engageError) {
        let actualErrorMessage = engageError.message;
        try {
          if (engageError.context && typeof engageError.context.json === 'function') {
            const errBody = await engageError.context.json();
            if (errBody && errBody.error) {
              actualErrorMessage = errBody.error;
            }
          }
        } catch (e) {}
        console.error('Parsed engage error:', actualErrorMessage);
        throw new Error(actualErrorMessage);
      }

      // 3. Commit State: Update to ENGAGED
      if (trackedId) {
        const { error: stateErr } = await supabase.functions.invoke('tracking', {
          body: { action: 'update_state', id: trackedId, state: 'ENGAGED' },
        });
        if (stateErr) console.warn('State update warning:', stateErr.message);
      }

      await fetchPipeline(); // Final sync after state update
      showToast('success', '🎉 Issue claimed! Comment posted. Check the Claimed tab.');
    } catch (err: any) {
      console.error('Claim failed:', err);
      showToast('error', '❌ ' + (err.message || 'Failed to claim issue'));
    } finally {
      setClaimingIssueUrl(null);
    }
  };

  // --- Tracking Logic (From Operations) ---
  const fetchPipeline = async () => {
    if (!session?.access_token) return;

    // Capture version to prevent overwriting optimistic state with stale fetch data
    const currentVersion = pipelineVersionRef.current;

    try {
      if (trackedIssues.length === 0) {
        setIsTrackingLoading(true);
      }

      const { data: resData, error: trackError } = await supabase.functions.invoke('tracking', {
        body: { action: 'list' },
      });
      if (trackError) throw new Error('Failed to fetch tracking data: ' + trackError.message);

      if (currentVersion !== pipelineVersionRef.current) {
        // An optimistic update happened while we were fetching!
        // Discard this stale response.
        return;
      }

      const normalizedData: Task[] = (resData.data || []).map((t: any) => ({
        ...t,
        external_url: t.external_url || t.github_issue_url || '',
        github_issue_url: t.github_issue_url || t.external_url || '',
        interview_notes_url:
          t.interview_notes_url || t.contribution_checklist?.interview_notes_url || '',
      }));
      setTasks(normalizedData);
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
      showToast(
        'error',
        `Cannot exceed 25 automated actions per day. You have ${25 - automationCountToday} left.`,
      );
      return;
    }

    if (scoutedIssues.length === 0) {
      showToast('error', '⚠️ No scouted issues. Go to Discovery and click Scan Now first.');
      return;
    }

    setIsAutomating(true);
    setAutomationError(null);

    const targets = scoutedIssues.slice(0, automationBatchSize);
    let successCount = 0;
    const claimedUrls: string[] = [];

    showToast('success', `⚡ Auto-claiming ${targets.length} issue(s)...`);

    for (const issue of targets) {
      try {
        const url = new URL(issue.url);
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length < 4 || parts[2] !== 'issues') continue;
        const [owner, repo, , number] = parts;

        const githubHandle = (userProfile as any)?.github_handle || 'developer';
        const autoMessage = `Hi! I'd love to work on this issue. I'm @${githubHandle} and I'm interested in contributing here. Could I be assigned this one? I'll get started right away! 🚀`;

        // 1. Secure the Lock: Save to tracking as DRAFTED first
        const { data: savedData, error: trackError } = await supabase.functions.invoke('tracking', {
          body: {
            action: 'save',
            issueData: {
              external_url: issue.url,
              github_issue_url: issue.url,
              external_id: issue.id.toString(),
              platform: 'github',
              title: issue.title,
              repo_name: issue.repoName,
              match_score: issue.evaluation?.matchScore,
              claimed_via: 'AUTO',
              initial_state: 'DRAFTED',
            },
          },
        });

        if (trackError) {
          let msg = trackError.message;
          try {
            if (trackError.context && typeof trackError.context.json === 'function') {
              const errBody = await trackError.context.json();
              if (errBody?.error) msg = errBody.error;
            }
          } catch (_) {}
          console.error(`Auto-claim failed (db lock) for ${issue.url}:`, msg);
          showToast('error', `❌ Failed: ${issue.title.slice(0, 40)}... — ${msg}`);
          continue;
        }

        const trackedId = savedData?.data?.id;

        // Remove from discovery list immediately since it's now tracked
        claimedUrls.push(issue.url);

        // 2. Execute Engagement (Post Comment)
        const { error: engageError } = await supabase.functions.invoke('engage', {
          body: {
            owner,
            repo,
            number: parseInt(number),
            draft: autoMessage,
            intent: 'REQUEST_ASSIGNMENT',
          },
        });

        if (engageError) {
          let msg = engageError.message;
          try {
            if (engageError.context && typeof engageError.context.json === 'function') {
              const errBody = await engageError.context.json();
              if (errBody?.error) msg = errBody.error;
            }
          } catch (_) {}
          console.error(`Auto-claim failed for ${issue.url}:`, msg);
          showToast('error', `❌ Failed: ${issue.title.slice(0, 40)}... — ${msg}`);
          continue;
        }

        // 3. Commit state to ENGAGED
        if (trackedId) {
          await supabase.functions.invoke('tracking', {
            body: { action: 'update_state', id: trackedId, state: 'ENGAGED' },
          });
        }

        // Increment DB counter directly (RPC uses SECURITY DEFINER which may fail from client)
        // Only increment if engage actually succeeded
        const newCount = automationCountToday + successCount + 1;
        await supabase
          .from('users')
          .update({
            automation_count_today: newCount,
            last_automation_date: new Date().toISOString().split('T')[0],
          })
          .eq('id', user.id);

        successCount++;
        showToast('success', `✅ Auto-claimed: ${issue.title.slice(0, 50)}...`);
      } catch (err: any) {
        console.error(`Automation error for ${issue.url}:`, err);
        showToast('error', `❌ Error: ${err.message}`);
      }
    }

    // Remove tracked issues from discovery list
    if (claimedUrls.length > 0) {
      const claimedSet = new Set(claimedUrls);
      setScoutedIssues((prev) => {
        const updated = prev.filter((i) => !claimedSet.has(i.url));
        sessionStorage.setItem('scout_discovered_issues', JSON.stringify(updated));
        return updated;
      });
      setAutomationCountToday((prev) => prev + successCount);
      await fetchPipeline();

      if (successCount > 0) {
        showToast(
          'success',
          `🎉 Done! ${successCount} issue(s) auto-claimed. Check the Claimed tab.`,
        );
      } else {
        showToast('error', '⚠️ Issues were tracked, but GitHub engagement failed for all of them.');
      }
    } else {
      showToast('error', '⚠️ No issues were successfully tracked or claimed.');
    }

    setIsAutomating(false);
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
            external_url: issueToSave.url,
            github_issue_url: issueToSave.url,
            external_id: issueToSave.id.toString(),
            platform: 'github',
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
      showToast('error', '❌ Error saving issue. It may already be tracked.');
    }
  };

  const handleUpdateState = async (trackedId: string, newState: import('../types').IssueState) => {
    if (pendingIssuesRef.current[trackedId]) return; // Prevent concurrent modifications on same issue

    const issueToUpdate = trackedIssues.find((i) => i.id === trackedId);
    if (!issueToUpdate) return;

    const previousState = issueToUpdate.state;
    const reqId = Date.now();

    // 1. Optimistically update local state immediately
    setTasks((prev) => prev.map((i) => (i.id === trackedId ? { ...i, state: newState } : i)));
    setIssuePending(trackedId, reqId);

    try {
      // 2. Persist to backend
      const { error } = await supabase.functions.invoke('tracking', {
        body: { action: 'update_state', id: trackedId, state: newState },
      });
      if (error) throw new Error(error.message);
      // Success! Keep optimistic state.
    } catch (err: any) {
      console.error('State update failed:', err);
      // 3. Rollback on failure ONLY if this request is still the active one
      if (pendingIssuesRef.current[trackedId] === reqId) {
        setTasks((prev) =>
          prev.map((i) => (i.id === trackedId ? { ...i, state: previousState } : i)),
        );
        showToast('error', 'Failed to update state: ' + err.message);
        // Explicitly increment version on rollback to invalidate fetches
        pipelineVersionRef.current += 1;
      }
    } finally {
      if (pendingIssuesRef.current[trackedId] === reqId) {
        setIssuePending(trackedId, null);
      }
    }
  };

  const handleUpdateChecklist = async (trackedId: string, checklist: any) => {
    if (pendingIssuesRef.current[trackedId]) return;

    const issueToUpdate = trackedIssues.find((i) => i.id === trackedId);
    if (!issueToUpdate) return;

    const previousChecklist = issueToUpdate.contribution_checklist;
    const reqId = Date.now();

    // 1. Optimistically update local state immediately
    setTasks((prev) =>
      prev.map((i) => (i.id === trackedId ? { ...i, contribution_checklist: checklist } : i)),
    );
    setIssuePending(trackedId, reqId);

    try {
      // 2. Persist to backend
      const { error } = await supabase.functions.invoke('tracking', {
        body: { action: 'update_checklist', id: trackedId, checklist },
      });
      if (error) throw new Error(error.message);
    } catch (err: any) {
      console.error('Checklist update failed:', err);
      // 3. Rollback on failure ONLY if this request is still the active one
      if (pendingIssuesRef.current[trackedId] === reqId) {
        setTasks((prev) =>
          prev.map((i) =>
            i.id === trackedId ? { ...i, contribution_checklist: previousChecklist } : i,
          ),
        );
        showToast('error', 'Failed to update checklist: ' + err.message);
        pipelineVersionRef.current += 1;
      }
    } finally {
      if (pendingIssuesRef.current[trackedId] === reqId) {
        setIssuePending(trackedId, null);
      }
    }
  };

  const handleUpdateNotesUrl = async (trackedId: string, notesUrl: string) => {
    if (pendingIssuesRef.current[trackedId]) return;

    const issueToUpdate = trackedIssues.find((i) => i.id === trackedId);
    if (!issueToUpdate) return;

    const previousNotesUrl = issueToUpdate.interview_notes_url;
    const previousChecklist = issueToUpdate.contribution_checklist;
    const updatedChecklist = {
      ...(previousChecklist || {}),
      interview_notes_url: notesUrl,
    };
    const reqId = Date.now();

    // 1. Optimistically update local state immediately
    setTasks((prev) =>
      prev.map((i) =>
        i.id === trackedId
          ? { ...i, interview_notes_url: notesUrl, contribution_checklist: updatedChecklist }
          : i,
      ),
    );
    setIssuePending(trackedId, reqId);

    try {
      // 2. Persist to backend
      const { error } = await supabase.functions.invoke('tracking', {
        body: {
          action: 'update_checklist',
          id: trackedId,
          checklist: updatedChecklist,
          interview_notes_url: notesUrl,
        },
      });
      if (error) throw new Error(error.message);
      if (!notesUrl) {
        showToast('success', 'Interview prep doc link removed.');
      } else {
        showToast('success', 'Interview prep doc linked successfully!');
      }
    } catch (err: any) {
      console.error('Notes URL update failed:', err);
      // 3. Rollback on failure
      if (pendingIssuesRef.current[trackedId] === reqId) {
        setTasks((prev) =>
          prev.map((i) =>
            i.id === trackedId
              ? {
                  ...i,
                  interview_notes_url: previousNotesUrl,
                  contribution_checklist: previousChecklist,
                }
              : i,
          ),
        );
        showToast('error', 'Failed to save notes link: ' + err.message);
        pipelineVersionRef.current += 1;
      }
    } finally {
      if (pendingIssuesRef.current[trackedId] === reqId) {
        setIssuePending(trackedId, null);
      }
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
    pendingIssues,
    handleSaveToPipeline,
    openDossier,
    claimingIssueUrl,
    handleClaimIssue,
    handleUpdateState,
    handleUpdateChecklist,
    handleUpdateNotesUrl,
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
    <div className="max-w-7xl mx-auto pb-12 w-full">
      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium pointer-events-auto animate-fade-in-up transition-all ${
              t.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
            }`}
          >
            {t.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {t.message}
          </div>
        ))}
      </div>

      {/* Sticky Header + Tabs */}
      <div className="sticky top-0 z-20 bg-zinc-50">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-4 border-b border-zinc-200 pb-4 pt-2 gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 mb-1">
              Mission Control
            </h1>
            <p className="text-zinc-500 font-mono text-xs sm:text-sm hidden sm:block">
              Central dashboard for discovery and autonomous engagement.
            </p>
          </div>

          {/* Agent Status UI */}
          <div className="flex sm:flex-col sm:items-end items-center justify-between gap-2 sm:gap-1">
            <div className="flex items-center gap-2">
              {isDiscovering ? (
                <Loader2 size={14} className="text-emerald-500 animate-spin" />
              ) : (
                <Search size={14} className="text-zinc-400" />
              )}
              <span className="font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                {isDiscovering ? 'SCANNING...' : isAutomating ? 'ENGAGING...' : 'IDLE'}
              </span>
              <span className="font-mono text-[10px] text-zinc-400 hidden sm:inline">
                · Last scan: {lastScanTime ? getTimeAgo(lastScanTime) : 'Never'}
              </span>
            </div>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="text-[10px] font-mono font-bold border border-zinc-300 px-3 py-1 uppercase tracking-widest hover:bg-zinc-100 disabled:opacity-50 rounded"
            >
              {isSyncing ? 'Syncing...' : 'Sync GitHub'}
            </button>
          </div>
        </div>

        {/* Development Query Telemetry Inspector */}
        {import.meta.env.DEV && activeQueryTelemetry && (
          <div className="mb-3 px-3 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 font-mono text-xs flex items-center gap-2 overflow-x-auto shadow-sm">
            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wider whitespace-nowrap">
              DEV TELEMETRY
            </span>
            <span className="text-zinc-400 text-[11px] truncate flex-1">
              {activeQueryTelemetry}
            </span>
            <span className="text-zinc-500 text-[10px] whitespace-nowrap">
              Candidates: {scoutedIssues.length}
            </span>
          </div>
        )}

        {/* Workflow Tabs - scrollable on mobile */}
        <div className="mb-4 border-b border-zinc-200 flex gap-3 md:gap-6 overflow-x-auto overflow-y-hidden pb-px">
          <Link
            to="/app/discovery"
            className={`pb-2 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 whitespace-nowrap transition-colors ${location.pathname.includes('/discovery') ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <Search size={14} /> Discovery
          </Link>
          <Link
            to="/app/automation"
            className={`pb-2 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 whitespace-nowrap transition-colors ${location.pathname.includes('/automation') ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <Activity size={14} className={isAutomating ? 'text-emerald-500 animate-pulse' : ''} />{' '}
            Claimed
          </Link>
          <Link
            to="/app/assigned"
            className={`pb-2 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 whitespace-nowrap transition-colors ${location.pathname.includes('/assigned') ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <Terminal size={14} /> Assigned
          </Link>
          <Link
            to="/app/review"
            className={`pb-2 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 whitespace-nowrap transition-colors ${location.pathname.includes('/review') ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <Eye size={14} /> Review
          </Link>
          <Link
            to="/app/merged"
            className={`pb-2 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 whitespace-nowrap transition-colors ${location.pathname.includes('/merged') ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <PartyPopper size={14} /> Merged
          </Link>
          <Link
            to="/app/dropped"
            className={`pb-2 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 whitespace-nowrap transition-colors ${location.pathname.includes('/dropped') ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-400 hover:text-red-500'}`}
          >
            <ArchiveX size={14} /> Dropped
          </Link>
        </div>
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
