import type { NormalizedIssue, NormalizedComment, GitHubSnapshot } from './types.ts';
import { getSecret } from './secrets.ts';

export class GitHubAdapter {
  private get token(): string {
    try {
      return getSecret('GITHUB_TOKEN');
    } catch (e) {
      console.warn('[GitHubAdapter] No GITHUB_TOKEN provided. Using unauthenticated public endpoints.');
      return '';
    }
  }

  private get headers(): HeadersInit {
    const h: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Open-Source-Scout-Agent',
    };
    const t = this.token;
    if (t) {
      h['Authorization'] = `Bearer ${t}`;
    }
    return h;
  }

  /**
   * Search for issues on GitHub
   * @param query The GitHub search query
   * @param limit Max results to return
   */
  async searchIssues(query: string, limit: number = 10): Promise<NormalizedIssue[]> {
    const url = new URL('https://api.github.com/search/issues');
    url.searchParams.append('q', query);
    url.searchParams.append('per_page', limit.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`GitHub API Error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    return data.items.map(this.normalizeIssue.bind(this));
  }

  /**
   * Fetch comments for a specific issue
   */
  async fetchIssueComments(owner: string, repo: string, issueNumber: number, page: number = 1): Promise<NormalizedComment[]> {
    const url = new URL(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`);
    url.searchParams.append('per_page', '100'); // GitHub max
    url.searchParams.append('page', page.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`GitHub API Error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    return data.map(this.normalizeComment);
  }

  /**
   * Fetch a specific issue by owner, repo, and number
   */
  async fetchIssue(owner: string, repo: string, issueNumber: number): Promise<NormalizedIssue> {
    const url = new URL(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`);
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`GitHub API Error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    return this.normalizeIssue(data);
  }

  /**
   * Map the raw GitHub issue payload into our normalized format.
   */
  private normalizeIssue(raw: any): NormalizedIssue {
    const repoApiUrl = raw.repository_url || '';
    const repoName = repoApiUrl.replace('https://api.github.com/repos/', '');
    const repoUrl = `https://github.com/${repoName}`;

    return {
      id: raw.node_id || raw.id.toString(),
      url: raw.html_url,
      title: raw.title,
      body: raw.body || '',
      repoName: repoName,
      repoUrl: repoUrl,
      state: raw.state,
      isAssigned: raw.assignee !== null,
      labels: (raw.labels || []).map((l: any) => l.name),
      createdAt: raw.created_at,
    };
  }

  private normalizeComment(raw: any): NormalizedComment {
    return {
      id: raw.id.toString(),
      author: raw.user?.login || 'unknown',
      body: raw.body || '',
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }

  /**
   * Post a comment to a specific issue on GitHub
   */
  async postComment(owner: string, repo: string, issueNumber: number, body: string): Promise<{ commentId: string, url: string }> {
    const t = this.token;
    if (!t) {
      throw new Error('Cannot post comment without a GITHUB_TOKEN configured.');
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ body })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`GitHub API Error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    return {
      commentId: data.id.toString(),
      url: data.html_url
    };
  }

  /**
   * Fetch a complete snapshot of an issue for Phase 6 Monitoring & Reconciliation.
   */
  async fetchSnapshot(owner: string, repo: string, issueNumber: number, trackedIssueId: string): Promise<GitHubSnapshot> {
    const url = new URL(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`);
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`GitHub API Error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const raw = await response.json();
    
    // Fetch comments (just the latest page for now)
    const comments = await this.fetchIssueComments(owner, repo, issueNumber, 1);

    return {
      trackedIssueId,
      githubIssueUrl: raw.html_url,
      state: raw.state as 'open' | 'closed',
      stateReason: raw.state_reason || null,
      assignees: (raw.assignees || []).map((a: any) => a.login),
      comments: comments,
      relatedPullRequests: []
    };
  }
}

export const githubAdapter = new GitHubAdapter();
