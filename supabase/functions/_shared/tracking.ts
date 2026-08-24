import { getSecret } from './secrets.ts';
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

  async getTrackedIssues(authHeader: string, userId?: string, state?: string, limit = 50): Promise<TrackedIssue[]> {
    const supabase = this.getClient(authHeader);
    let query = supabase
      .from('tracked_issues')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (userId) query = query.eq('user_id', userId);
    if (state) query = query.eq('state', state);

    const { data, error } = await query;
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
}

export const trackingService = new TrackingService();

