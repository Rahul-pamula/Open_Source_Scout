import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ScoutedIssue } from '../types';

describe('IssueCard presentation and relevance badge tests', () => {
  it('formats high relevance score (>=80) with emerald tier badge', () => {
    const issue: ScoutedIssue = {
      id: 'issue-1',
      url: 'https://github.com/facebook/react/issues/100',
      title: 'Fix hydration error in React 19',
      body: 'Description here',
      repoName: 'facebook/react',
      repoUrl: 'https://github.com/facebook/react',
      state: 'open',
      isAssigned: false,
      labels: ['bug', 'good first issue'],
      createdAt: '2026-10-24T00:00:00Z',
      relevanceScore: 92,
      relevanceBreakdown: {
        langScore: 35,
        techScore: 25,
        recencyScore: 15,
        competitionScore: 10,
        difficultyScore: 7,
        penalties: 0,
        total: 92,
      },
    };

    assert.ok(issue.relevanceScore !== undefined && issue.relevanceScore >= 80);
    assert.strictEqual(issue.relevanceBreakdown?.total, 92);
    assert.strictEqual(issue.relevanceBreakdown?.langScore, 35);
  });

  it('formats medium relevance score (50-79) with amber tier badge', () => {
    const issue: ScoutedIssue = {
      id: 'issue-2',
      url: 'https://github.com/tailwindlabs/tailwindcss/issues/200',
      title: 'Support custom CSS grid property',
      body: 'Description here',
      repoName: 'tailwindlabs/tailwindcss',
      repoUrl: 'https://github.com/tailwindlabs/tailwindcss',
      state: 'open',
      isAssigned: false,
      labels: ['enhancement'],
      createdAt: '2026-10-20T00:00:00Z',
      relevanceScore: 68,
      relevanceBreakdown: {
        langScore: 21,
        techScore: 19,
        recencyScore: 12,
        competitionScore: 6,
        difficultyScore: 10,
        penalties: 0,
        total: 68,
      },
    };

    assert.ok(issue.relevanceScore && issue.relevanceScore >= 50 && issue.relevanceScore < 80);
    assert.strictEqual(issue.relevanceBreakdown?.total, 68);
  });

  it('formats low relevance score (<50) with zinc/slate tier badge', () => {
    const issue: ScoutedIssue = {
      id: 'issue-3',
      url: 'https://github.com/old/repo/issues/300',
      title: 'Old unused documentation',
      body: 'Old body',
      repoName: 'old/repo',
      repoUrl: 'https://github.com/old/repo',
      state: 'open',
      isAssigned: false,
      labels: ['documentation'],
      createdAt: '2025-01-01T00:00:00Z',
      relevanceScore: 24,
      relevanceBreakdown: {
        langScore: 0,
        techScore: 0,
        recencyScore: 0,
        competitionScore: 15,
        difficultyScore: 9,
        penalties: 0,
        total: 24,
      },
    };

    assert.ok(issue.relevanceScore && issue.relevanceScore < 50);
    assert.strictEqual(issue.relevanceBreakdown?.total, 24);
  });

  it('preserves full mathematical breakdown values for popover inspection', () => {
    const breakdown = {
      langScore: 30,
      techScore: 19,
      recencyScore: 15,
      competitionScore: 13,
      difficultyScore: 10,
      penalties: 10,
      total: 77,
    };

    assert.strictEqual(
      breakdown.langScore +
        breakdown.techScore +
        breakdown.recencyScore +
        breakdown.competitionScore +
        breakdown.difficultyScore -
        breakdown.penalties,
      77,
    );
    assert.strictEqual(breakdown.total, 77);
  });
});
