import type { NormalizedComment } from '../types';

/**
 * High-precision regex heuristic targeting contributor verbal claim expressions.
 * Covers:
 * - "I'd like to pick this up", "I'd like to work on this", "I would like to take this"
 * - "assign this to me", "assign me please", "please assign to me"
 * - "can I work on this", "can I take this", "can I pick this up"
 * - "working on a fix", "working on a PR", "submitting a PR soon"
 * - "taking this up", "claim this issue", "PR incoming"
 */
export const CLAIM_INTENT_REGEX =
  /\b(?:i(?:'d| would)? like to (?:work on(?: this)?|pick (?:this )?up|take (?:this(?: up)?)?|grab|handle)|assign (?:this to me|me|to me)|can i (?:work on(?: this)?|take (?:this)?|pick (?:this )?up|grab|have)|working on (?:a |this )?(?:pr|fix|patch)|taking this(?: up)?|claim(?:ing)? this(?: issue)?|i(?:'m| am) on this|putting up a pr|pr incoming)\b/i;

export type ContestationLevel = 'uncontested' | 'low-competition' | 'contested';

export interface ContestationAssessment {
  level: ContestationLevel;
  isContested: boolean;
  claimant?: string;
  matchedPhrase?: string;
  confidence: number;
  reason: string;
}

/**
 * Evaluates issue comments and metadata to detect verbal claim intent and competition level.
 * Drops or flags issues where prior contributors have already claimed the work.
 */
export function evaluateCommentContestation(
  commentsCount: number = 0,
  recentComments: (NormalizedComment | string)[] = [],
  isAssigned: boolean = false,
): ContestationAssessment {
  // If GitHub issue is already officially assigned
  if (isAssigned) {
    return {
      level: 'contested',
      isContested: true,
      confidence: 1.0,
      reason: 'Issue is officially assigned to a contributor on GitHub.',
    };
  }

  // Inspect any recent comments for verbal claim intent
  for (const comment of recentComments) {
    const body = typeof comment === 'string' ? comment : comment?.body || '';
    const author = typeof comment === 'string' ? undefined : comment?.author;

    const match = body.match(CLAIM_INTENT_REGEX);
    if (match) {
      return {
        level: 'contested',
        isContested: true,
        claimant: author,
        matchedPhrase: match[0],
        confidence: 0.95,
        reason: author
          ? `@${author} expressed claim intent: "${match[0]}"`
          : `Comment expressed verbal claim intent: "${match[0]}"`,
      };
    }
  }

  // If comments count is 0, issue is 100% fresh and uncontested
  if (commentsCount === 0) {
    return {
      level: 'uncontested',
      isContested: false,
      confidence: 1.0,
      reason:
        '0 comments — uncontested fresh opportunity with highest maintainer assignment chance.',
    };
  }

  // If comments count is 1 or 2 with no claim keywords detected, low-competition discussion
  if (commentsCount <= 2) {
    return {
      level: 'low-competition',
      isContested: false,
      confidence: 0.85,
      reason: `${commentsCount} comment(s) with general discussion only (no claim intent detected).`,
    };
  }

  // If comments count is > 2, treat as contested/active discussion thread
  return {
    level: 'contested',
    isContested: true,
    confidence: 0.8,
    reason: `${commentsCount} comments present — heated or active thread with reduced assignment probability.`,
  };
}
