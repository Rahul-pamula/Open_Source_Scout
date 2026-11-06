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
    
    // Compatibility layer: Map Scout v1 states (DRAFTED, DISCOVERED, EVALUATED, ENGAGED, etc.)
    // to PostgreSQL execution_state ENUM values ('QUEUED', 'ACTIVE', 'CANCELLED', etc.)
    const rawInitialState = issueData.initial_state || 'QUEUED';
    let dbState = rawInitialState;
    if (rawInitialState === 'ENGAGED' || rawInitialState === 'ASSIGNED') {
      dbState = 'ACTIVE';
    } else if (
      rawInitialState === 'DISCOVERED' ||
      rawInitialState === 'EVALUATED' ||
      rawInitialState === 'DRAFTED'
    ) {
      dbState = 'QUEUED';
    } else if (rawInitialState === 'REJECTED') {
      dbState = 'CANCELLED';
    }

    const initialState: IssueState = dbState as IssueState;
    const issueUrl = issueData.external_url || issueData.github_issue_url || '';
    const issueId = issueData.external_id || (issueUrl ? issueUrl.split('/').pop() : '') || '0';

    try {
      const taskPayload: Record<string, any> = {
        user_id: userId,
        external_url: issueUrl,
        external_id: issueId,
        platform: issueData.platform || 'github',
        title: issueData.title,
        repo_name: issueData.repo_name,
        state: initialState,
        match_score: issueData.match_score || null,
      };

      if (issueData.claimed_via) {
        taskPayload.claimed_via = issueData.claimed_via;
      }

      let { data, error } = await supabase
        .from('tasks')
        .insert(taskPayload)
        .select()
        .single();

      // Gracefully retry without claimed_via if tasks table schema cache lacks the column
      if (error && (error.message?.includes('claimed_via') || error.code === '42703' || error.code === 'PGRST204')) {
        delete taskPayload.claimed_via;
        const retry = await supabase
          .from('tasks')
          .insert(taskPayload)
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (!error && data) {
        return {
          ...data,
          github_issue_url: issueUrl,
        };
      }

      // If tasks table insert had an error, try legacy tracked_issues table
      const legacyPayload: Record<string, any> = {
        user_id: userId,
        github_issue_url: issueUrl,
        title: issueData.title,
        repo_name: issueData.repo_name,
        state: initialState,
        match_score: issueData.match_score || null,
        claimed_via: issueData.claimed_via || 'MANUAL',
      };

      let { data: legacyData, error: legacyError } = await supabase
        .from('tracked_issues')
        .insert(legacyPayload)
        .select()
        .single();

      if (legacyError && (legacyError.message?.includes('claimed_via') || legacyError.code === '42703' || legacyError.code === 'PGRST204')) {
        delete legacyPayload.claimed_via;
        const legacyRetry = await supabase
          .from('tracked_issues')
          .insert(legacyPayload)
          .select()
          .single();
        legacyData = legacyRetry.data;
        legacyError = legacyRetry.error;
      }

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

    let { data: tasksData, error } = await query;
    
    // Always query legacy tracked_issues and merge to ensure zero data loss across migrations
    let legacyData: any[] = [];
    try {
      let legacyQuery = supabase
        .from('tracked_issues')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (userId) legacyQuery = legacyQuery.eq('user_id', userId);
      if (state) {
        // Also respect state on legacy table if querying by state
        legacyQuery = legacyQuery.eq('state', state);
      }
      const legacyRes = await legacyQuery;
      if (legacyRes.data) {
        legacyData = legacyRes.data;
      }
    } catch (_) {
      // Silently continue if tracked_issues table does not exist
    }

    // Combine tasks and legacy tracked_issues, deduplicating by URL or ID
    const combinedMap = new Map<string, any>();

    // 1. Add legacy records first
    for (const item of legacyData) {
      const key = item.github_issue_url || item.external_url || item.id;
      if (key) combinedMap.set(key, item);
    }

    // 2. Add/overwrite with newer tasks table records
    for (const item of (tasksData || [])) {
      const key = item.external_url || item.github_issue_url || item.id;
      if (key) combinedMap.set(key, item);
    }

    const data = Array.from(combinedMap.values()).sort((a, b) => {
      const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
      const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
      return timeB - timeA;
    });
    
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

    if (!updateError && data) {
      return data;
    }

    // Fallback to legacy tracked_issues table
    const legacyState = requestedState as string;
    const { data: legacyData, error: legacyError } = await supabase
      .from('tracked_issues')
      .update({ state: legacyState })
      .eq('id', id)
      .select()
      .single();

    if (!legacyError && legacyData) {
      const issueUrl = legacyData.github_issue_url || '';
      return {
        ...legacyData,
        state: legacyData.state,
        external_url: issueUrl,
        github_issue_url: issueUrl,
      };
    }

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        throw new Error(`400: Invalid state transition. Target state ${newState} not allowed from current state.`);
      }
      throw new Error(`Supabase Update Error: ${legacyError?.message || updateError.message}`);
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
      // Fallback to legacy tracked_issues table
      const { error: legacyError } = await supabase
        .from('tracked_issues')
        .update({ contribution_checklist: checklist })
        .eq('id', id);

      if (!legacyError) {
        return;
      }

      // Gracefully fall back to updating only contribution_checklist if column is missing on tasks
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
      throw new Error(`Supabase Update Error: ${legacyError.message || error.message}`);
    }
  }

  async updateNotesUrl(authHeader: string, id: string, notesUrl: string): Promise<void> {
    const supabase = this.getClient(authHeader);

    let currentChecklist: any = {};
    const { data: task } = await supabase
      .from('tasks')
      .select('contribution_checklist')
      .eq('id', id)
      .maybeSingle();

    if (task) {
      currentChecklist = task.contribution_checklist || {};
    } else {
      const { data: legacyTask } = await supabase
        .from('tracked_issues')
        .select('contribution_checklist')
        .eq('id', id)
        .maybeSingle();
      if (legacyTask) {
        currentChecklist = legacyTask.contribution_checklist || {};
      }
    }

    const updatedChecklist = { ...currentChecklist, interview_notes_url: notesUrl };
    await this.updateIssueChecklist(authHeader, id, updatedChecklist);
  }
}

export const trackingService = new TrackingService();

