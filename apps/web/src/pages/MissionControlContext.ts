import type { ScoutedIssue, TrackedIssue } from '../types';

export interface MissionControlContextType {
  userProfile: { bio: string; skills: string[] } | null;

  // Discovery
  scoutedIssues: ScoutedIssue[];
  isDiscovering: boolean;
  discoveryStatus: string | null;
  discoveryError: string | null;
  lastScanTime: number | null;
  handleDiscover: () => Promise<void>;

  // Pipeline
  trackedIssues: TrackedIssue[];
  isTrackingLoading: boolean;
  trackingError: string | null;
  handleSaveToPipeline: (issueId: string) => Promise<void>;
  openDossier: (githubUrl: string) => void;
  claimingIssueUrl: string | null;
  handleClaimIssue: (githubUrl: string) => Promise<void>;
  handleUpdateState: (trackedId: string, newState: import('../types').IssueState) => Promise<void>;

  // Sync
  isSyncing: boolean;
  syncStatus: { lastSynced: string | null; error: string | null };
  handleSync: () => Promise<void>;
  fetchPipeline: () => Promise<void>;

  // Automation
  automationCountToday: number;
  automationBatchSize: number;
  setAutomationBatchSize: (size: number) => void;
  isAutomating: boolean;
  automationError: string | null;
  handleAutomateProcess: () => Promise<void>;
}
