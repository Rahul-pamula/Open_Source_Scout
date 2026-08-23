import { getSecret } from './secrets.ts';
import fs from 'fs';
import path from 'path';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { IssueState, TrackedIssue } from './types.ts';

const SUPABASE_URL = getSecret('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = getSecret('SUPABASE_ANON_KEY') || '';

export class TrackingService {
  
  private getClient(authHeader: string) {
    if (!authHeader) throw new Error('Authorization header is required');
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });
  }

  isValidTransition(currentState: IssueState, nextState: IssueState): boolean {
    if (currentState === nextState) return true;

    const transitions: Record<IssueState, IssueState[]> = {
      'DISCOVERED': ['EVALUATED', 'REJECTED'],
      'EVALUATED': ['DRAFTED', 'ENGAGED', 'REJECTED'],
      'DRAFTED': ['ENGAGED', 'REJECTED'],
      'ENGAGED': ['ASSIGNED', 'REJECTED'],
      'ASSIGNED': ['COMPLETED'],
      'COMPLETED': [],
      'REJECTED': []
    };

    return transitions[currentState].includes(nextState);
  }

  async saveIssue(authHeader: string, userId: string, issueData: any): Promise<TrackedIssue> {
    const supabase = this.getClient(authHeader);
    
    const initialState: IssueState = issueData.match_score ? 'EVALUATED' : 'DISCOVERED';

    const { data, error } = await supabase
      .from('tracked_issues')
      .insert({
        user_id: userId,
        github_issue_url: issueData.github_issue_url,
        title: issueData.title,
        repo_name: issueData.repo_name,
        state: initialState,
        match_score: issueData.match_score || null,
      })
      .select()
      .single();

    if (error) throw new Error(`Supabase Insert Error: ${error.message}`);
    return data;
  }

  async getTrackedIssues(authHeader: string): Promise<TrackedIssue[]> {
    const supabase = this.getClient(authHeader);
    const { data, error } = await supabase
      .from('tracked_issues')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`Supabase Select Error: ${error.message}`);
    return data || [];
  }

  async updateIssueState(authHeader: string, id: string, newState: IssueState): Promise<TrackedIssue> {
    const supabase = this.getClient(authHeader);
    
    // First fetch current state to validate transition
    const { data: currentIssue, error: fetchError } = await supabase
      .from('tracked_issues')
      .select('state')
      .eq('id', id)
      .single();
      
    if (fetchError) throw new Error(`Supabase Select Error: ${fetchError.message}`);
    if (!currentIssue) throw new Error('Issue not found');

    if (!this.isValidTransition(currentIssue.state as IssueState, newState)) {
      throw new Error(`Invalid state transition from ${currentIssue.state} to ${newState}`);
    }

    const { data, error: updateError } = await supabase
      .from('tracked_issues')
      .update({ state: newState })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw new Error(`Supabase Update Error: ${updateError.message}`);
    return data;
  }

  async syncTrackingState(authHeader: string): Promise<void> {
    const issues = await this.getTrackedIssues(authHeader);
    
    // Write state.json
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(dataDir, 'state.json'), JSON.stringify({
      updatedAt: new Date().toISOString(),
      issues
    }, null, 2));

    // Write TRACKING_BOARD.md
    let md = '# Open Source Scout - Tracking Board\n\n';
    const states: IssueState[] = ['DISCOVERED', 'EVALUATED', 'DRAFTED', 'ENGAGED', 'ASSIGNED', 'COMPLETED', 'REJECTED'];
    
    for (const state of states) {
      const stateIssues = issues.filter(i => i.state === state);
      md += `## ${state} (${stateIssues.length})\n`;
      if (stateIssues.length === 0) {
        md += '*No issues in this state.*\n\n';
        continue;
      }
      for (const issue of stateIssues) {
        const issueNumber = issue.github_issue_url.split('/').pop();
        md += `- **[${issue.repo_name}#${issueNumber}](${issue.github_issue_url})**: ${issue.title} (Match: ${issue.match_score || 'N/A'}%)\n`;
      }
      md += '\n';
    }

    fs.writeFileSync(path.join(dataDir, 'TRACKING_BOARD.md'), md);
  }
}

export const trackingService = new TrackingService();
