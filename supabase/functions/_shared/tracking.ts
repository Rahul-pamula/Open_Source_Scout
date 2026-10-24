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
    const issueUrl = issueData.external_url || issueData.github_issue_url || '';
    const issueId = issueData.external_id || (issueUrl ? issueUrl.split('/').pop() : '') || '0';

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          external_url: issueUrl,
          external_id: issueId,
          platform: issueData.platform || 'github',
          title: issueData.title,
          repo_name: issueData.repo_name,
          state: initialState,
          match_score: issueData.match_score || null,
          claimed_via: issueData.claimed_via || 'MANUAL',
        })
        .select()
        .single();

      if (!error && data) {
        return {
          ...data,
          github_issue_url: issueUrl,
        };
      }

      // If tasks table insert had an error, try legacy tracked_issues table
      const { data: legacyData, error: legacyError } = await supabase
        .from('tracked_issues')
        .insert({
          user_id: userId,
          github_issue_url: issueUrl,
          title: issueData.title,
          repo_name: issueData.repo_name,
          state: initialState,
          match_score: issueData.match_score || null,
          claimed_via: issueData.claimed_via || 'MANUAL',
        })
        .select()
        .single();

      if (legacyError) {
        throw new Error(`Supabase Insert Error: ${error ? error.message : legacyError.message}`);
      }

      return {
        ...legacyData,
        external_url: legacyData.github_issue_url,
        external_id: legacyData.id,
        platform: 'github',
      };
    } catch (err: any) {
      if (err.message?.startsWith('Supabase Insert Error')) throw err;
      throw new Error(`Supabase Insert Error: ${err.message}`);
    }
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

    let { data, error } = await query;
    if (error) {
      // Fallback to legacy tracked_issues
      let legacyQuery = supabase
        .from('tracked_issues')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (userId) legacyQuery = legacyQuery.eq('user_id', userId);
      const { data: legacyData, error: legacyError } = await legacyQuery;
      if (legacyError) {
        throw new Error(`Supabase Select Error: ${error.message}`);
      }
      data = legacyData;
    }
    
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
      const issueUrl = task.external_url || task.github_issue_url || '';
      return {
        ...task,
        state: uiState,
        external_url: issueUrl,
        github_issue_url: issueUrl,
        interview_notes_url:
          task.interview_notes_url || task.contribution_checklist?.interview_notes_url || '',
      };
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

    const updatePayload: Record<string, any> = { contribution_checklist: checklist };
    if (checklist && typeof checklist.interview_notes_url === 'string') {
      updatePayload.interview_notes_url = checklist.interview_notes_url;
    }

    const { error } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      // Gracefully fall back to updating only contribution_checklist if column is missing
      if (
        updatePayload.interview_notes_url &&
        (error.message.includes('column') || error.code === '42703')
      ) {
        const { error: fallbackError } = await supabase
          .from('tasks')
          .update({ contribution_checklist: checklist })
          .eq('id', id);
        if (fallbackError) throw new Error(`Supabase Update Error: ${fallbackError.message}`);
        return;
      }
      throw new Error(`Supabase Update Error: ${error.message}`);
    }
  }

  async updateNotesUrl(authHeader: string, id: string, notesUrl: string): Promise<void> {
    const supabase = this.getClient(authHeader);

    const { data: task } = await supabase
      .from('tasks')
      .select('contribution_checklist')
      .eq('id', id)
      .maybeSingle();

    const currentChecklist = (task && task.contribution_checklist) || {};
    const updatedChecklist = { ...currentChecklist, interview_notes_url: notesUrl };

    await this.updateIssueChecklist(authHeader, id, updatedChecklist);
  }
}

export const trackingService = new TrackingService();

