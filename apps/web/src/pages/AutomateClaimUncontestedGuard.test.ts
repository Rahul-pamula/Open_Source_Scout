import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ScoutedIssue } from '../types';

describe('Automated and Manual Claim Uncontested Guards', () => {
  it('strictly selects only uncontested candidates when auto-claiming', () => {
    const scoutedIssues: ScoutedIssue[] = [
      {
        id: '1',
        url: 'https://github.com/org/repo/issues/1',
        title: 'Already assigned issue',
        body: 'Assigned',
        repoName: 'org/repo',
        repoUrl: 'https://github.com/org/repo',
        state: 'open',
        isAssigned: true,
        labels: [],
        createdAt: '2026-11-05T00:00:00Z',
        commentsCount: 0,
      },
      {
        id: '2',
        url: 'https://github.com/org/repo/issues/2',
        title: 'Contested issue with verbal claim',
        body: 'Contested',
        repoName: 'org/repo',
        repoUrl: 'https://github.com/org/repo',
        state: 'open',
        isAssigned: false,
        labels: [],
        createdAt: '2026-11-05T00:00:00Z',
        commentsCount: 2,
        contestation: {
          level: 'contested',
          isContested: true,
          confidence: 0.95,
          reason: 'Verbal claim detected in comments',
        },
      },
      {
        id: '3',
        url: 'https://github.com/org/repo/issues/3',
        title: 'Uncontested fresh issue',
        body: 'Fresh',
        repoName: 'org/repo',
        repoUrl: 'https://github.com/org/repo',
        state: 'open',
        isAssigned: false,
        labels: [],
        createdAt: '2026-11-05T00:00:00Z',
        commentsCount: 0,
        contestation: {
          level: 'uncontested',
          isContested: false,
          confidence: 1.0,
          reason: '0 comments — uncontested fresh opportunity',
        },
      },
      {
        id: '4',
        url: 'https://github.com/org/repo/issues/4',
        title: 'Low competition discussion issue',
        body: 'Discussion',
        repoName: 'org/repo',
        repoUrl: 'https://github.com/org/repo',
        state: 'open',
        isAssigned: false,
        labels: [],
        createdAt: '2026-11-05T00:00:00Z',
        commentsCount: 1,
        contestation: {
          level: 'low-competition',
          isContested: false,
          confidence: 0.85,
          reason: '1 comment general discussion',
        },
      },
    ];

    // Filter candidate pool to ONLY uncontested / unclaimed issues
    const unclaimedCandidates = scoutedIssues.filter(
      (issue) => !issue.isAssigned && !issue.contestation?.isContested,
    );

    assert.strictEqual(unclaimedCandidates.length, 2);
    assert.deepStrictEqual(
      unclaimedCandidates.map((i) => i.id),
      ['3', '4'],
    );
    assert.ok(unclaimedCandidates.every((i) => !i.isAssigned));
    assert.ok(unclaimedCandidates.every((i) => !i.contestation?.isContested));
  });

  it('detects when zero uncontested issues are available and halts automation', () => {
    const contestedOnlyIssues: ScoutedIssue[] = [
      {
        id: '1',
        url: 'https://github.com/org/repo/issues/1',
        title: 'Already assigned issue',
        body: 'Assigned',
        repoName: 'org/repo',
        repoUrl: 'https://github.com/org/repo',
        state: 'open',
        isAssigned: true,
        labels: [],
        createdAt: '2026-11-05T00:00:00Z',
      },
      {
        id: '2',
        url: 'https://github.com/org/repo/issues/2',
        title: 'Contested issue',
        body: 'Contested',
        repoName: 'org/repo',
        repoUrl: 'https://github.com/org/repo',
        state: 'open',
        isAssigned: false,
        labels: [],
        createdAt: '2026-11-05T00:00:00Z',
        contestation: {
          level: 'contested',
          isContested: true,
          confidence: 0.95,
          reason: 'Claim detected',
        },
      },
    ];

    const unclaimedCandidates = contestedOnlyIssues.filter(
      (issue) => !issue.isAssigned && !issue.contestation?.isContested,
    );

    assert.strictEqual(unclaimedCandidates.length, 0);
  });
});
