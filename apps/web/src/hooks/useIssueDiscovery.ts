import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { ScoutedIssue, Task, NormalizedIssue } from '../types';
import type { ExperienceLevel } from '../types/user';
import { buildGitHubSearchQuery, buildRelaxedGitHubSearchQuery } from '../utils/queryBuilder';

interface UseIssueDiscoveryOptions {
  userProfile: { bio?: string; skills?: string[]; experience_level?: ExperienceLevel } | null;
  authExperienceLevel?: ExperienceLevel | null;
  authSkills?: string[];
  trackedIssues: Task[];
  onNotify?: (type: 'success' | 'error', message: string) => void;
}

export function useIssueDiscovery({
  userProfile,
  authExperienceLevel,
  authSkills,
  trackedIssues,
  onNotify,
}: UseIssueDiscoveryOptions) {
  const [scoutedIssues, setScoutedIssues] = useState<ScoutedIssue[]>(() => {
    const cached = sessionStorage.getItem('scout_discovered_issues');
    return cached ? JSON.parse(cached) : [];
  });
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryStatus, setDiscoveryStatus] = useState<string | null>(null);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [activeQueryTelemetry, setActiveQueryTelemetry] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<number | null>(() => {
    const cached = sessionStorage.getItem('scout_last_scan_time');
    return cached ? parseInt(cached, 10) : null;
  });

  // Sync to sessionStorage
  useEffect(() => {
    if (scoutedIssues.length > 0) {
      sessionStorage.setItem('scout_discovered_issues', JSON.stringify(scoutedIssues));
    }
    if (lastScanTime) {
      sessionStorage.setItem('scout_last_scan_time', lastScanTime.toString());
    }
  }, [scoutedIssues, lastScanTime]);

  const handleDiscover = useCallback(async () => {
    if (isDiscovering) return;
    try {
      setIsDiscovering(true);
      setDiscoveryError(null);
      setDiscoveryStatus('Searching GitHub...');

      const dynamicSearchQuery = buildGitHubSearchQuery({
        skills: userProfile?.skills || authSkills,
        experienceLevel: userProfile?.experience_level || authExperienceLevel || 'Beginner',
      });
      setActiveQueryTelemetry(dynamicSearchQuery);

      // Fetch 50 issues from GitHub search to give us a pool to shuffle from
      const { data: searchData, error: searchError } = await supabase.functions.invoke('search', {
        body: { query: dynamicSearchQuery, limit: 50 },
      });

      if (searchError) throw new Error('Failed to fetch from GitHub: ' + searchError.message);

      let rawEligibleIssues: NormalizedIssue[] = searchData.data || [];

      if (rawEligibleIssues.length === 0) {
        setDiscoveryStatus('Broadening search parameters...');
        const relaxedQuery = buildRelaxedGitHubSearchQuery({
          skills: userProfile?.skills || authSkills,
          experienceLevel: userProfile?.experience_level || authExperienceLevel || 'Beginner',
        });
        setActiveQueryTelemetry(relaxedQuery);

        const { data: relaxedData, error: relaxedError } = await supabase.functions.invoke(
          'search',
          { body: { query: relaxedQuery, limit: 50 } },
        );

        if (!relaxedError && relaxedData?.data && relaxedData.data.length > 0) {
          rawEligibleIssues = relaxedData.data;
          onNotify?.('success', 'Broadened search parameters to find opportunities');
        } else {
          setDiscoveryStatus(null);
          setDiscoveryError(
            "Scout couldn't find a strong match yet. Try updating your Agent Directives.",
          );
          setLastScanTime(Date.now());
          setIsDiscovering(false);
          return;
        }
      }

      setDiscoveryStatus('Filtering candidates...');

      // Filter out issues already in the pipeline
      const currentTrackedUrls = new Set(
        trackedIssues.map((t) => t.external_url || t.github_issue_url).filter(Boolean),
      );
      const untrackedIssues = rawEligibleIssues.filter(
        (issue) => !currentTrackedUrls.has(issue.url),
      );

      // Shuffle the untracked issues to give fresh results on each click
      const shuffledIssues = untrackedIssues.sort(() => 0.5 - Math.random());
      const newIssues = shuffledIssues.slice(0, 10);

      if (newIssues.length === 0) {
        setDiscoveryStatus(null);
        setDiscoveryError('Found issues, but they are already in your Active Pipeline.');
        setLastScanTime(Date.now());
        setIsDiscovering(false);
        return;
      }

      setScoutedIssues(newIssues as ScoutedIssue[]);
      setDiscoveryError(null);
      setDiscoveryStatus(null);
      setLastScanTime(Date.now());
    } catch (err: any) {
      setDiscoveryError(err.message || 'Scout encountered an error during discovery.');
      setDiscoveryStatus(null);
    } finally {
      setIsDiscovering(false);
    }
  }, [
    isDiscovering,
    userProfile?.skills,
    userProfile?.experience_level,
    authSkills,
    authExperienceLevel,
    trackedIssues,
    onNotify,
  ]);

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
  }, [userProfile, scoutedIssues.length, lastScanTime, isDiscovering, handleDiscover]);

  return {
    scoutedIssues,
    setScoutedIssues,
    isDiscovering,
    discoveryStatus,
    discoveryError,
    setDiscoveryError,
    lastScanTime,
    activeQueryTelemetry,
    handleDiscover,
  };
}
