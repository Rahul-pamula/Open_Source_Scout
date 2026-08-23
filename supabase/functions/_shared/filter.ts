import type { NormalizedIssue } from './types.ts';

export class FilterEngine {
  // Common labels that indicate an issue is not suitable for picking up
  private invalidLabels = new Set([
    'wontfix',
    'duplicate',
    'invalid',
    'spam',
    'question',
    'discussion',
    'stale'
  ]);

  /**
   * Run the deterministic filtering pipeline.
   * Rejects assigned, closed, or invalid issues.
   */
  public filterEligibleIssues(issues: NormalizedIssue[]): NormalizedIssue[] {
    return issues.filter((issue) => {
      // 1. Must be open
      if (issue.state !== 'open') {
        return false;
      }

      // 2. Must not be assigned
      if (issue.isAssigned) {
        return false;
      }

      // 3. Must not have invalid labels
      const hasInvalidLabel = issue.labels.some(label => 
        this.invalidLabels.has(label.toLowerCase())
      );
      if (hasInvalidLabel) {
        return false;
      }

      // 4. Must have a body/description (hard to evaluate empty issues)
      if (!issue.body || issue.body.trim().length < 20) {
        return false;
      }

      return true;
    });
  }
}

export const filterEngine = new FilterEngine();
