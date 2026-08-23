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

export interface EvaluationResult {
  matchScore: number;
  intent: string;
  explanation: string;
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
