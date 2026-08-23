import { getSecret } from './secrets.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { TrackedIssue, GitHubSnapshot, ReconciliationEventType, IssueState } from './types.ts';

const SUPABASE_URL = getSecret('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = getSecret('SUPABASE_SERVICE_ROLE_KEY') || '';

export class ReconciliationService {
  private getClient() {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for reconciliation.');
    }
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }

  /**
   * Compare previous state with current GitHub Snapshot and transition.
   */
  async reconcile(issue: TrackedIssue, snapshot: GitHubSnapshot, githubUsername: string): Promise<void> {
    const supabase = this.getClient();
    let newState = issue.state;
    let needsAttention = issue.needs_attention;
    const events: { type: ReconciliationEventType, previous: string, next: string, meta: any }[] = [];

    // 1. Assignment Detection
    if (newState === 'ENGAGED') {
      const isAssigned = snapshot.assignees.some(a => a.toLowerCase() === githubUsername.toLowerCase());
      if (isAssigned) {
        newState = 'ASSIGNED';
        events.push({
          type: 'ISSUE_ASSIGNED',
          previous: issue.state,
          next: newState,
          meta: { assignees: snapshot.assignees }
        });
      }
    }

    // 2. Maintainer Response Detection
    // Check if there's a new comment from someone other than the user
    // In a real app we'd verify author association (OWNER, COLLABORATOR), 
    // but here we just check if it's not the user and they replied after we engaged.
    // For simplicity, we just look at the latest comment.
    if (snapshot.comments.length > 0) {
      const latestComment = snapshot.comments[snapshot.comments.length - 1];
      if (latestComment.author.toLowerCase() !== githubUsername.toLowerCase()) {
        // Only trigger if we haven't already flagged it
        if (!needsAttention) {
          needsAttention = true;
          events.push({
            type: 'MAINTAINER_RESPONDED',
            previous: newState,
            next: newState,
            meta: { author: latestComment.author }
          });
        }
      }
    }

    // 3. Completion Detection
    if (snapshot.state === 'closed') {
      if (snapshot.stateReason === 'not_planned') {
        if (newState !== 'REJECTED') {
          newState = 'REJECTED';
          events.push({
            type: 'ISSUE_REJECTED',
            previous: issue.state,
            next: newState,
            meta: { reason: 'not_planned' }
          });
        }
      } else {
        // Closed as completed. Check for PR merge.
        const mergedPR = snapshot.relatedPullRequests.find(pr => 
          pr.state === 'merged' && pr.author.toLowerCase() === githubUsername.toLowerCase()
        );
        
        if (mergedPR && newState !== 'COMPLETED') {
          newState = 'COMPLETED';
          events.push({
            type: 'ISSUE_COMPLETED',
            previous: issue.state,
            next: newState,
            meta: { prUrl: mergedPR.url }
          });
        }
      }
    }

    // 4. Persist Changes if any
    if (newState !== issue.state || needsAttention !== issue.needs_attention) {
      const { error: updateError } = await supabase
        .from('tracked_issues')
        .update({ 
          state: newState, 
          needs_attention: needsAttention,
          updated_at: new Date().toISOString()
        })
        .eq('id', issue.id);

      if (updateError) {
        console.error(`[Reconciliation] Failed to update state for ${issue.id}:`, updateError);
        return;
      }
    }

    // 5. Persist Events
    for (const event of events) {
      const { error: insertError } = await supabase
        .from('reconciliation_events')
        .insert({
          tracked_issue_id: issue.id,
          event_type: event.type,
          previous_state: event.previous,
          new_state: event.next,
          metadata: event.meta
        });
      
      if (insertError) {
        console.error(`[Reconciliation] Failed to insert event ${event.type} for ${issue.id}:`, insertError);
      }
    }

    // 6. Contribution Milestones Tracking (Automatically Detected)
    const milestonesToInsert = [];

    // ASSIGNED
    if (snapshot.assignees.some(a => a.toLowerCase() === githubUsername.toLowerCase())) {
      milestonesToInsert.push({ tracked_issue_id: issue.id, milestone_type: 'ASSIGNED', source: 'github' });
    }

    // COMMENTED
    if (snapshot.comments.some(c => c.author.toLowerCase() === githubUsername.toLowerCase())) {
      milestonesToInsert.push({ tracked_issue_id: issue.id, milestone_type: 'COMMENTED', source: 'github' });
    }

    // PR_OPENED
    if (snapshot.relatedPullRequests.some(pr => pr.author.toLowerCase() === githubUsername.toLowerCase())) {
      milestonesToInsert.push({ tracked_issue_id: issue.id, milestone_type: 'PR_OPENED', source: 'github' });
    }

    // PR_MERGED
    if (snapshot.relatedPullRequests.some(pr => pr.state === 'merged' && pr.author.toLowerCase() === githubUsername.toLowerCase())) {
      milestonesToInsert.push({ tracked_issue_id: issue.id, milestone_type: 'PR_MERGED', source: 'github' });
    }

    // COMPLETED
    if (newState === 'COMPLETED') {
      milestonesToInsert.push({ tracked_issue_id: issue.id, milestone_type: 'COMPLETED', source: 'github' });
    }

    for (const ms of milestonesToInsert) {
      // Idempotency: ON CONFLICT DO NOTHING ensures manual milestones or existing milestones aren't overwritten
      const { error: msError } = await supabase
        .from('contribution_milestones')
        .upsert(ms, { onConflict: 'tracked_issue_id, milestone_type', ignoreDuplicates: true });
      
      if (msError) {
        console.error(`[Reconciliation] Failed to insert milestone ${ms.milestone_type} for ${issue.id}:`, msError);
      }
    }
  }
}

export const reconciliationService = new ReconciliationService();
