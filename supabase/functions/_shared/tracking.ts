import { getSecret } from './secrets.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { IssueState, Task } from './types.ts';

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
      'QUEUED': ['ACTIVE', 'CANCELLED'],
      'ACTIVE': ['PAUSED', 'CANCEL_REQUESTED', 'BLOCKED', 'FAILED', 'COMPLETED', 'SUBMITTED'],
      'PAUSED': ['ACTIVE', 'CANCEL_REQUESTED'],
      'CANCEL_REQUESTED': ['STOPPING', 'CANCELLED'],
      'STOPPING': ['CANCELLED', 'FAILED'],
      'BLOCKED': ['ACTIVE', 'CANCEL_REQUESTED', 'FAILED'],
      'CANCELLED': [],
      'FAILED': [],
      'COMPLETED': [],
      'SUBMITTED': []
    };

    return transitions[currentState].includes(nextState);
  }

  async saveIssue(authHeader: string, userId: string, issueData: any): Promise<Task> {
    const supabase = this.getClient(authHeader);
    
    // Allow caller to specify initial state (e.g. ENGAGED for manual claims)
    const initialState: IssueState = issueData.initial_state || 'QUEUED';

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        external_url: issueData.external_url,
        external_id: issueData.external_id,
        platform: issueData.platform || 'github',
        title: issueData.title,
        repo_name: issueData.repo_name,
        state: initialState,
        match_score: issueData.match_score || null,
        claimed_via: issueData.claimed_via || 'MANUAL',
      })
      .select()
      .single();

    if (error) throw new Error(`Supabase Insert Error: ${error.message}`);
    return data;
  }

  async getTasks(authHeader: string, userId?: string, state?: string, limit = 50): Promise<Task[]> {
    const supabase = this.getClient(authHeader);
    let query = supabase
      .from('tasks')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (userId) query = query.eq('user_id', userId);
    
    // Map V1 state request to V2 DB state
    if (state) {
      let dbState = state;
      if (state === 'ENGAGED' || state === 'ASSIGNED') dbState = 'ACTIVE';
      else if (state === 'DISCOVERED' || state === 'EVALUATED' || state === 'DRAFTED') dbState = 'QUEUED';
      else if (state === 'REJECTED') dbState = 'CANCELLED';
      query = query.eq('state', dbState);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Supabase Select Error: ${error.message}`);
    
    // Compatibility layer: Map V2 states back to V1 states for the UI
    const mappedData = (data || []).map(task => {
      let uiState = task.state;
      if (task.state === 'ACTIVE') {
        // If it was assigned to a maintainer or has an assignee in metadata, it's ASSIGNED
        // Otherwise default to ENGAGED
        uiState = task.contribution_checklist?.maintainer_assigned ? 'ASSIGNED' : 'ENGAGED';
      } else if (task.state === 'QUEUED') {
        uiState = 'DISCOVERED';
      } else if (task.state === 'CANCELLED') {
        uiState = 'REJECTED';
      }
      return { ...task, state: uiState };
    });

    return mappedData;
  }

  async updateIssueState(authHeader: string, id: string, requestedState: IssueState | string): Promise<Task> {
    const supabase = this.getClient(authHeader);
    
    // Compatibility layer: Map Scout v1 UI states to v2 execution states
    let newState = requestedState as IssueState;
    if (newState === 'ENGAGED' || newState === 'ASSIGNED') newState = 'ACTIVE' as IssueState;
    else if (newState === 'DISCOVERED' || newState === 'EVALUATED' || newState === 'DRAFTED') newState = 'QUEUED' as IssueState;
    else if (newState === 'REJECTED') newState = 'CANCELLED' as IssueState;
    
    const transitions: Record<IssueState, IssueState[]> = {
      'QUEUED': ['ACTIVE', 'CANCELLED'],
      'ACTIVE': ['PAUSED', 'CANCEL_REQUESTED', 'BLOCKED', 'FAILED', 'COMPLETED', 'SUBMITTED', 'QUEUED'],
      'PAUSED': ['ACTIVE', 'CANCEL_REQUESTED', 'QUEUED'],
      'CANCEL_REQUESTED': ['STOPPING', 'CANCELLED', 'ACTIVE'],
      'STOPPING': ['CANCELLED', 'FAILED'],
      'BLOCKED': ['ACTIVE', 'CANCEL_REQUESTED', 'FAILED', 'QUEUED'],
      'CANCELLED': ['QUEUED'], // Allow reviving a cancelled task
      'FAILED': ['QUEUED', 'ACTIVE'], // Allow retrying
      'COMPLETED': ['ACTIVE'], // Allow reopening
      'SUBMITTED': ['ACTIVE'] // Allow reverting review
    };

    const allowedCurrentStates: IssueState[] = [];
    for (const [key, allowedNextStates] of Object.entries(transitions)) {
      if (allowedNextStates.includes(newState) || key === newState) {
        allowedCurrentStates.push(key as IssueState);
      }
    }

    const { data, error: updateError } = await supabase
      .from('tasks')
      .update({ state: newState })
      .eq('id', id)
      .in('state', allowedCurrentStates)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        throw new Error(`400: Invalid state transition. Target state ${newState} not allowed from current state.`);
      }
      throw new Error(`Supabase Update Error: ${updateError.message}`);
    }
    return data;
  }

  async updateIssueChecklist(authHeader: string, id: string, checklist: any): Promise<void> {
    const supabase = this.getClient(authHeader);
    
    const { error } = await supabase
      .from('tasks')
      .update({ contribution_checklist: checklist })
      .eq('id', id);
      
    if (error) throw new Error(`Supabase Update Error: ${error.message}`);
  }
}

export const trackingService = new TrackingService();

