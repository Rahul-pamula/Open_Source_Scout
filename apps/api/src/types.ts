export interface NormalizedIssue {
  id: string;
  url: string;
  title: string;
  body: string;
  repoName: string;
  repoUrl: string;
  state: string;
  isAssigned: boolean;
  labels: string[];
  createdAt: string;
}

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface EvaluationResult {
  matchScore: number;
  intent: string;
  explanation: string;
  difficulty: DifficultyLevel;
  estimatedEffort: string;
}

export interface NormalizedComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export type ClaimStatusType = 'NONE' | 'INTEREST_EXPRESSED' | 'MAINTAINER_ASSIGNED' | 'UNCERTAIN';

export interface ClaimResult {
  claimStatus: ClaimStatusType;
  claimant?: string;
  confidence: number;
  evidence?: string;
}

export type IssueState = 'DISCOVERED' | 'EVALUATED' | 'DRAFTED' | 'ENGAGED' | 'ASSIGNED' | 'COMPLETED' | 'REJECTED';

export interface TrackedIssue {
  id: string;
  user_id: string;
  github_issue_url: string;
  title: string;
  repo_name: string;
  state: IssueState;
  match_score?: number;
  created_at: string;
  updated_at: string;
}

export type EngagementIntent = 'REQUEST_ASSIGNMENT' | 'PROPOSE_SOLUTION' | 'ASK_CLARIFICATION' | 'EXPRESS_INTEREST';

export interface DraftResult {
  intent: EngagementIntent;
  draft: string;
  reasoning: string;
}

export type AutonomyLevel = 'L1' | 'L2' | 'L3';

export interface AutonomyPolicy {
  level: AutonomyLevel;
  enabled: boolean; // kill switch
  allowedRepositories: string[];
  allowedIntents: EngagementIntent[];
  minimumMatchScore: number;
  maximumDailyEngagements: number;
  cooldownMinutes: number;
  requireNoClaimant: boolean;
}
