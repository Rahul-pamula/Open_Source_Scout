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

// A combined type for the UI to consume
export interface ScoutedIssue extends NormalizedIssue {
  evaluation?: EvaluationResult;
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

export type IssueState =
  'DISCOVERED' | 'EVALUATED' | 'DRAFTED' | 'ENGAGED' | 'ASSIGNED' | 'COMPLETED' | 'REJECTED';

export type TaskPlatform = 'github' | 'jira' | 'linear' | 'manual';

export interface Task {
  id: string;
  user_id: string;
  platform: TaskPlatform;
  external_id: string;
  external_url: string;
  title: string;
  description?: string;
  repo_name?: string;
  repo_clone_url?: string;
  priority?: string;
  labels?: string[];
  state: IssueState;
  match_score?: number;
  agent_status?: string;
  agent_ide?: string;
  pr_url?: string;
  integration_id?: string;
  created_at: string;
  updated_at: string;
  // retained for frontend backwards compatibility
  contribution_checklist?: any;
}
