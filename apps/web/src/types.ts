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

// A combined type for the UI to consume
export interface ScoutedIssue extends NormalizedIssue {
  evaluation?: EvaluationResult;
}
