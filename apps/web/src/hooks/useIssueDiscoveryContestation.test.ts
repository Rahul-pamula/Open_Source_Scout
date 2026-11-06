import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCommentContestation } from '../utils/claimDetector';
import type { NormalizedIssue, ScoutedIssue } from '../types';

describe('Discovery Contestation Pipeline Ranking & Filtering', () => {
  it('filters out claimed and heavily contested issues from the candidate pool', () => {
    const rawIssues: NormalizedIssue[] = [
      {
        id: 'issue-1',
        url: 'https://github.com/org/repo/issues/1',
        title: 'Uncontested fresh issue',
        body: 'Clean issue with zero comments',
        repoName: 'org/repo',
        repoUrl: 'https://github.com/org/repo',
        state: 'open',
        isAssigned: false,
        labels: ['good first issue'],
        createdAt: '2026-11-05T00:00:00Z',
        commentsCount: 0,
      },
      {
        id: 'issue-2',
        url: 'https://github.com/org/repo/issues/2',
        title: 'Heavily contested issue with verbal claims',
        body: 'Issue claimed by another developer in thread',
        repoName: 'org/repo',
        repoUrl: 'https://github.com/org/repo',
        state: 'open',
        isAssigned: false,
        labels: ['help wanted'],
        createdAt: '2026-11-04T00:00:00Z',
        commentsCount: 4,
      },
      {
        id: 'issue-3',
        url: 'https://github.com/org/repo/issues/3',
        title: 'Low competition discussion issue',
        body: 'Clarification discussion with 1 comment',
        repoName: 'org/repo',
        repoUrl: 'https://github.com/org/repo',
        state: 'open',
        isAssigned: false,
        labels: ['help wanted'],
        createdAt: '2026-11-05T01:00:00Z',
        commentsCount: 1,
      },
      {
        id: 'issue-4',
        url: 'https://github.com/org/repo/issues/4',
        title: 'Another fresh issue',
        body: 'Fresh ticket with 0 comments',
        repoName: 'org/repo',
        repoUrl: 'https://github.com/org/repo',
        state: 'open',
        isAssigned: false,
        labels: ['good first issue'],
        createdAt: '2026-11-05T02:00:00Z',
        commentsCount: 0,
      },
    ];

    const processedIssues: ScoutedIssue[] = rawIssues.map((issue) => {
      const contestation = evaluateCommentContestation(
        issue.commentsCount ?? 0,
        [],
        issue.isAssigned,
      );
      return {
        ...issue,
        relevanceScore: 80,
        contestation,
      };
    });

    const viableIssues = processedIssues.filter((issue) => !issue.contestation?.isContested);
    assert.strictEqual(viableIssues.length, 3, 'Should filter out the 4-comment contested issue');
    assert.ok(viableIssues.every((i) => i.id !== 'issue-2'));

    // Ranked list prioritizes uncontested issues
    const rankedIssues = [...processedIssues].sort((a, b) => {
      const contestationPriority =
        (a.contestation?.isContested ? 1 : 0) - (b.contestation?.isContested ? 1 : 0);
      if (contestationPriority !== 0) return contestationPriority;
      return (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
    });

    assert.strictEqual(rankedIssues[rankedIssues.length - 1].id, 'issue-2');
    assert.strictEqual(rankedIssues[0].contestation?.isContested, false);
  });
});
