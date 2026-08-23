import type { NormalizedIssue, AutonomyPolicy, EvaluationResult, ClaimResult, DraftResult } from './types.ts';

export interface SafetyGateResult {
  allowed: boolean;
  reasons: string[];
  checks: {
    autonomyEnabled: boolean;
    repositoryAllowed: boolean;
    intentAllowed: boolean;
    matchScoreSufficient: boolean;
    issueOpen: boolean;
    claimantClear: boolean;
    contentValid: boolean;
  };
}

export class SafetyGateService {
  
  /**
   * The absolute final decision layer before GitHub posting.
   * Fails closed if any mandatory check fails or is uncertain.
   */
  isSafeToEngage(
    issue: NormalizedIssue,
    policy: AutonomyPolicy,
    evaluation: EvaluationResult,
    claim: ClaimResult,
    draftResult: DraftResult
  ): SafetyGateResult {
    
    const GLOBAL_KILL_SWITCH = process.env.AUTONOMOUS_ENGAGEMENT_ENABLED === 'false';

    const checks = {
      // Is L3 fully enabled? (Kill switch check)
      autonomyEnabled: !GLOBAL_KILL_SWITCH && policy.enabled && policy.level === 'L3',
      
      // Is the repository explicitly whitelisted?
      repositoryAllowed: policy.allowedRepositories.includes(issue.repoName),
      
      // Is the intent explicitly whitelisted?
      intentAllowed: policy.allowedIntents.includes(draftResult.intent),
      
      // Does it meet the minimum match score?
      matchScoreSufficient: evaluation.matchScore >= policy.minimumMatchScore,
      
      // Is the issue strictly open and unassigned?
      issueOpen: issue.state === 'open' && !issue.isAssigned,
      
      // Does the claimant status satisfy the policy?
      claimantClear: true,
      
      // Does the content look reasonably valid?
      contentValid: true
    };

    if (policy.requireNoClaimant) {
      checks.claimantClear = claim.claimStatus === 'NONE';
    }

    // Basic content validation
    if (!draftResult.draft || draftResult.draft.trim().length < 10 || draftResult.draft.length > 3000) {
      checks.contentValid = false;
    }

    const reasons: string[] = [];
    if (!checks.autonomyEnabled) reasons.push('AUTONOMY_DISABLED: L3 is disabled or kill switch is active.');
    if (!checks.repositoryAllowed) reasons.push(`REPOSITORY_NOT_ALLOWED: ${issue.repoName} is not in the allowlist.`);
    if (!checks.intentAllowed) reasons.push(`INTENT_NOT_ALLOWED: ${draftResult.intent} is not in the allowlist.`);
    if (!checks.matchScoreSufficient) reasons.push(`SCORE_TOO_LOW: Match score ${evaluation.matchScore} is below minimum ${policy.minimumMatchScore}.`);
    if (!checks.issueOpen) reasons.push('ISSUE_CLOSED: Issue is not open or is already assigned.');
    if (!checks.claimantClear) reasons.push(`CLAIMANT_DETECTED: Claimant policy violated. Current status: ${claim.claimStatus}.`);
    if (!checks.contentValid) reasons.push('INVALID_CONTENT: Generated draft failed content validation.');

    const allowed = Object.values(checks).every(v => v === true);

    return {
      allowed,
      reasons,
      checks
    };
  }
}

export const safetyGateService = new SafetyGateService();
