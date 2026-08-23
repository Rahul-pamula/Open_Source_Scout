import { getSecret } from './secrets.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { githubAdapter } from './github.ts';
import { trackingService } from './tracking.ts';
import type { GitHubSnapshot, SyncHealth, TrackedIssue } from './types.ts';

const SUPABASE_URL = getSecret('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = getSecret('SUPABASE_SERVICE_ROLE_KEY') || '';

import { reconciliationService } from './reconciliation.ts';

export class SyncService {
  private getClient() {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for background sync operations.');
    }
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }

  /**
   * Generates GitHubSnapshots for all actively monitored issues.
   * Hands them off to the Reconciliation Engine.
   */
  async startSync(userId: string, githubUsername: string): Promise<{ snapshots: GitHubSnapshot[], health: SyncHealth }> {
    const supabase = this.getClient();
    const startTime = new Date().toISOString();
    let issuesChecked = 0;
    let apiRequests = 0;
    let errors: string[] = [];
    const snapshots: GitHubSnapshot[] = [];

    // Mark sync started
    await supabase.from('sync_health').update({ 
      last_sync_started: startTime,
      updated_at: new Date().toISOString()
    }).eq('id', '00000000-0000-0000-0000-000000000001');

    try {
      // 1. Fetch monitored issues for the user
      const { data: monitoredIssues, error: fetchError } = await supabase
        .from('tracked_issues')
        .select('*')
        .eq('user_id', userId)
        .in('state', ['ENGAGED', 'ASSIGNED']);

      if (fetchError) throw fetchError;
      
      const issues = (monitoredIssues || []) as TrackedIssue[];

      // 2. Query GitHub and Reconcile
      for (const issue of issues) {
        try {
          issuesChecked++;
          const [owner, repo] = issue.repo_name.split('/');
          const issueNumber = parseInt(issue.github_issue_url.split('/').pop() || '0');
          
          if (!owner || !repo || !issueNumber) {
            throw new Error(`Invalid GitHub URL format for tracked issue ${issue.id}`);
          }

          const snapshot = await githubAdapter.fetchSnapshot(owner, repo, issueNumber, issue.id);
          apiRequests += 2; // fetchSnapshot makes 1 issue API call and 1 comments API call
          snapshots.push(snapshot);
          
          // Chunk 2: Reconcile!
          await reconciliationService.reconcile(issue, snapshot, githubUsername);

        } catch (err: any) {
          console.error(`[SyncService] Failed to snapshot issue ${issue.id}:`, err);
          errors.push(`Issue ${issue.id}: ${err.message}`);
        }
      }

      // Mark sync completed
      const endTime = new Date().toISOString();
      const healthData = {
        last_sync_completed: endTime,
        issues_checked: issuesChecked,
        api_requests_made: apiRequests,
        errors: errors.length > 0 ? errors.join('; ') : null,
        updated_at: endTime
      };

      await supabase.from('sync_health').update(healthData).eq('id', '00000000-0000-0000-0000-000000000001');

      return {
        snapshots,
        health: {
          last_sync_started: startTime,
          last_sync_completed: endTime,
          last_sync_failed: null,
          issues_checked: issuesChecked,
          api_requests_made: apiRequests,
          errors: healthData.errors
        }
      };

    } catch (criticalError: any) {
      console.error('[SyncService] Critical failure during sync:', criticalError);
      
      const failTime = new Date().toISOString();
      await supabase.from('sync_health').update({
        last_sync_failed: failTime,
        errors: criticalError.message,
        updated_at: failTime
      }).eq('id', '00000000-0000-0000-0000-000000000001');
      
      throw criticalError;
    }
  }
}

export const syncService = new SyncService();
