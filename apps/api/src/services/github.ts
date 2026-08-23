import type { NormalizedIssue } from '../types.js';

export class GitHubAdapter {
  private token: string | undefined;

  constructor() {
    this.token = process.env.GITHUB_TOKEN;
    if (!this.token) {
      console.warn('[GitHubAdapter] No GITHUB_TOKEN provided. Using unauthenticated public endpoints (rate limits will be strict).');
    }
  }

  private get headers(): HeadersInit {
    const h: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Open-Source-Scout-Agent',
    };
    if (this.token) {
      h['Authorization'] = `Bearer ${this.token}`;
    }
    return h;
  }

  /**
   * Search for issues on GitHub
   * @param query The GitHub search query (e.g. 'is:open is:issue label:"good first issue"')
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
    return data.items.map(this.normalizeIssue);
  }

  /**
   * Map the raw GitHub issue payload into our normalized format.
   * This ensures the rest of the backend (Filters, Groq) doesn't care about GitHub's specific schema.
   */
  private normalizeIssue(raw: any): NormalizedIssue {
    // raw.repository_url looks like "https://api.github.com/repos/owner/repo"
    // We want to extract "owner/repo"
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
      labels: (raw.labels || []).map((l: any) => l.name),
      createdAt: raw.created_at,
    };
  }
}

// Export a singleton instance
export const githubAdapter = new GitHubAdapter();
