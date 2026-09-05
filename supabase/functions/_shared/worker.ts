import { trackingService } from './tracking.ts';
import { githubAdapter } from './github.ts';
import { claimDetector } from './claimDetector.ts';
import { lockService } from './lock.ts';
import { autonomyPolicyService } from './autonomyPolicy.ts';
import { groqEvaluator } from './groq.ts';
import { safetyGateService } from './safety.ts';
import { rateLimiterService } from './rateLimiter.ts';
import { idempotencyService } from './idempotency.ts';
import { auditService } from './audit.ts';
import type { EngagementIntent, NormalizedIssue } from './types.ts';
import { getSecret } from './secrets.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = getSecret('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = getSecret('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export class AutonomousWorker {

  async runWorker(authHeader: string | undefined, userId: string, profile: any, count: number = 5) {
    console.log(`[Worker] Starting autonomous run for user: ${userId}, count: ${count}`);
    
    // 0. Check Daily Automation Limits (Max 25/day)
    const { data: currentCount, error } = await supabase.rpc('increment_automation_count', {
      user_id: userId,
      increment_by: 0 // Just peek
    });
    
    if (error) {
      console.error(`[Worker] Failed to check limits for ${userId}`, error);
      return;
    }
    
    if (currentCount + count > 25) {
      console.warn(`[Worker] User ${userId} would exceed daily limit of 25. Current: ${currentCount}`);
      return; // Or we could just process the remaining allowance, but failing is safer.
    }

    // 1. Fetch Policy
    const policy = await autonomyPolicyService.getPolicy(userId, authHeader);
    
    // 2. Fetch Discovered Issues
    const issues = await trackingService.getTrackedIssues(authHeader || '');
    const discoveredIssues = issues.filter(i => i.state === 'DISCOVERED');
    
    const targets = discoveredIssues.slice(0, count);
    
    let successCount = 0;
    
    for (const trackedIssue of targets) {
      const lockKey = `worker_lock_${trackedIssue.id}`;
      const hasLock = await lockService.acquireLock(lockKey);
      
      if (!hasLock) {
        console.log(`[Worker] Skipping ${trackedIssue.repo_name}#${trackedIssue.title} - Lock held`);
        continue;
      }

      try {
        await this.processIssue(authHeader, userId, profile, trackedIssue, policy);
      } catch (error: any) {
        console.error(`[Worker] Error processing ${trackedIssue.repo_name}:`, error);
        await auditService.logEvent({
          repoName: trackedIssue.repo_name,
          issueNumber: parseInt(trackedIssue.github_issue_url.split('/').pop() || '0'),
          intent: 'UNKNOWN',
          autonomyLevel: policy.level,
          safetyDecision: {},
          result: 'ERROR',
          failureReason: error.message
        });
      } finally {
        await lockService.releaseLock(lockKey);
      }
    }
    
    console.log(`[Worker] Completed autonomous run for user: ${userId}. Successes: ${successCount}`);
  }

  private async processIssue(authHeader: string | undefined, userId: string, profile: any, trackedIssue: any, policy: any): Promise<boolean> {
    const [owner, repo] = trackedIssue.repo_name.split('/');
    const issueNumber = parseInt(trackedIssue.github_issue_url.split('/').pop());

    // 1. Fetch Live Data
    const liveIssue = await githubAdapter.fetchIssue(owner, repo, issueNumber);
    const comments = await githubAdapter.fetchIssueComments(owner, repo, issueNumber, 1);
    const claim = await claimDetector.detectClaimStatus(liveIssue, comments);

    // 2. Evaluate
    const evaluation = await groqEvaluator.evaluateIssue(liveIssue, profile);
    
    // Quick early exit if score too low to save tokens on drafting
    if (evaluation.matchScore < policy.minimumMatchScore) {
      await trackingService.updateIssueState(authHeader || '', trackedIssue.id, 'REJECTED');
      return false;
    }

    // 3. Draft
    const draftResult = await groqEvaluator.generateCommentDraft(liveIssue, comments, profile, evaluation.intent as EngagementIntent);

    // 4. Safety Gate
    const safety = safetyGateService.isSafeToEngage(liveIssue, policy, evaluation, claim, draftResult);

    if (!safety.allowed) {
      await auditService.logEvent({
        repoName: trackedIssue.repo_name,
        issueNumber,
        intent: draftResult.intent,
        draft: draftResult.draft,
        autonomyLevel: policy.level,
        safetyDecision: safety.checks,
        result: 'BLOCKED',
        failureReason: safety.reasons.join(', ')
      });
      // Do not reject the issue here, just don't engage autonomously. The user can still L1 manually engage.
      return false;
    }

    if (policy.level === 'L2') {
      // Auto-Draft only. Store draft somewhere (in real app, update tracked_issues with draft).
      // For now, just mark state as DRAFTED.
      await trackingService.updateIssueState(authHeader || '', trackedIssue.id, 'DRAFTED');
      return false;
    }

    if (policy.level === 'L3') {
      // 5. Rate Limits & Idempotency
      await rateLimiterService.checkRateLimits(authHeader, userId, trackedIssue.repo_name);
      
      const idempotencyKey = await idempotencyService.checkAndLockEngagement(
        authHeader,
        userId,
        trackedIssue.repo_name,
        issueNumber,
        draftResult.intent,
        draftResult.draft
      );

      // 6. Post Comment
      const postResult = await githubAdapter.postComment(owner, repo, issueNumber, draftResult.draft);
      
      // 7. Record Success
      await idempotencyService.recordSuccessfulEngagement(authHeader, idempotencyKey, postResult.commentId);
      
      // 8. Update State & Audit
      await trackingService.updateIssueState(authHeader || '', trackedIssue.id, 'ENGAGED');
      await auditService.logEvent({
        repoName: trackedIssue.repo_name,
        issueNumber,
        intent: draftResult.intent,
        draft: draftResult.draft,
        autonomyLevel: policy.level,
        safetyDecision: safety.checks,
        result: 'SUCCESS'
      });
      
      // 9. Increment Daily Counter
      await supabase.rpc('increment_automation_count', {
        user_id: userId,
        increment_by: 1
      });
      
      return true;
    }
    return false;
  }
}

export const autonomousWorker = new AutonomousWorker();
