export interface NormalizedIssue {
  id: string;
  url: string;
  title: string;
  body: string;
  repoName: string;
  repoUrl: string;
  state: string;
  labels: string[];
  createdAt: string;
}
