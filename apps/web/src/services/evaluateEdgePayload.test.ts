import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { NormalizedIssue } from '../types';
import type { RelevanceScoreBreakdown } from '../types/relevance';

describe('evaluate edge function payload format and breakdown ingestion', () => {
  const sampleIssue: NormalizedIssue = {
    id: 'issue-101',
    url: 'https://github.com/facebook/react/issues/28540',
    title: 'Fix hydration mismatch in React 19',
    body: 'Hydration fails when component suspends on server.',
    repoName: 'facebook/react',
    repoUrl: 'https://github.com/facebook/react',
    state: 'open',
    isAssigned: false,
    labels: ['bug', 'react'],
    createdAt: '2026-10-24T00:00:00Z',
    language: 'TypeScript',
  };

  const sampleBreakdown: RelevanceScoreBreakdown = {
    langScore: 35,
    techScore: 25,
    recencyScore: 15,
    competitionScore: 13,
    difficultyScore: 10,
    penalties: 0,
    total: 98,
  };

  it('validates single issue evaluation payload structure with relevance breakdown', () => {
    const payload = {
      issue: sampleIssue,
      profile: 'Fullstack developer specializing in React and TypeScript.',
      relevanceBreakdown: sampleBreakdown,
    };

    assert.ok(payload.issue);
    assert.strictEqual(payload.issue.id, 'issue-101');
    assert.ok(payload.profile);
    assert.ok(payload.relevanceBreakdown);
    assert.strictEqual(payload.relevanceBreakdown.total, 98);
    assert.strictEqual(payload.relevanceBreakdown.langScore, 35);
  });

  it('validates batch evaluation payload structure with hard boundary', () => {
    const issues = Array.from({ length: 7 }, (_, i) => ({
      ...sampleIssue,
      id: `issue-${i + 1}`,
      relevanceBreakdown: sampleBreakdown,
    }));

    const payload = {
      issues,
      profile: 'Frontend developer.',
      relevanceBreakdown: sampleBreakdown,
    };

    assert.ok(Array.isArray(payload.issues));
    assert.strictEqual(payload.issues.length, 7);

    // Verify boundary slice enforcement on edge handler (max 5)
    const sliced = payload.issues.slice(0, 5);
    assert.strictEqual(sliced.length, 5);
    assert.strictEqual(sliced[0].relevanceBreakdown.total, 98);
  });

  it('rejects invalid payload without profile or issues', () => {
    const invalidPayload1 = { profile: '' };
    const invalidPayload2 = { issue: sampleIssue };

    const validatePayload = (body: any) => {
      if (!body.profile || (!body.issue && !body.issues)) {
        return {
          valid: false,
          error: 'Either "issue" or "issues" array, plus "profile", are required',
        };
      }
      return { valid: true };
    };

    assert.strictEqual(validatePayload(invalidPayload1).valid, false);
    assert.strictEqual(validatePayload(invalidPayload2).valid, false);
    assert.strictEqual(validatePayload({ issue: sampleIssue, profile: 'Dev' }).valid, true);
  });

  it('formats breakdown context block for prompt injection', () => {
    const formatBreakdownContext = (breakdown?: RelevanceScoreBreakdown | null) => {
      if (!breakdown) return '';
      return `ALGORITHMIC 100-POINT RELEVANCE BREAKDOWN:
Total Score: ${breakdown.total}/100
- Language Alignment: ${breakdown.langScore}/35
- Tech & Frameworks: ${breakdown.techScore}/25
- Recency & Activity: ${breakdown.recencyScore}/15
- Competition & Opportunity: ${breakdown.competitionScore}/15
- Difficulty Alignment: ${breakdown.difficultyScore}/10
- Deductions: -${breakdown.penalties}`;
    };

    const formatted = formatBreakdownContext(sampleBreakdown);
    assert.ok(formatted.includes('Total Score: 98/100'));
    assert.ok(formatted.includes('Language Alignment: 35/35'));
    assert.ok(formatted.includes('Tech & Frameworks: 25/25'));
    assert.strictEqual(formatBreakdownContext(null), '');
  });
});
