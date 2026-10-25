import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateRelevanceScore } from '../utils/relevanceScorer';
import type { IssueScoringTarget } from '../types/relevance';
import type { UserProfile } from '../types/user';

describe('DossierPanel evaluation relevance injection', () => {
  const mockProfile: UserProfile = {
    id: 'user-123',
    email: 'dev@example.com',
    experience_level: 'intermediate',
    primary_language: 'TypeScript',
    skills: ['TypeScript', 'React', 'Node.js', 'TailwindCSS'],
    frameworks: ['React', 'Node.js'],
    bio: 'Fullstack developer specializing in React and TypeScript.',
  };

  it('correctly calculates relevance breakdown for a dossier issue target', () => {
    const issueTarget: IssueScoringTarget = {
      title: 'Fix state sync race condition in React table component',
      body: 'When updating records rapidly in React, TypeScript type checks fail.',
      labels: ['bug', 'help wanted', 'frontend'],
      language: 'TypeScript',
      repository_topics: ['react', 'typescript', 'frontend'],
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      comments: 1,
    };

    const breakdown = calculateRelevanceScore(issueTarget, mockProfile);

    assert.ok(breakdown.total > 0, 'Total score should be positive');
    assert.strictEqual(breakdown.langScore, 35, 'Exact primary language should award 35 pts');
    assert.ok(breakdown.techScore >= 19, 'Matching React should award high tech score');
    assert.strictEqual(breakdown.recencyScore, 15, 'Updated today should award max recency');
    assert.strictEqual(breakdown.competitionScore, 13, '1 comment should award 13 pts');
    assert.strictEqual(
      breakdown.difficultyScore,
      10,
      'Intermediate with help wanted awards 10 pts',
    );
    assert.strictEqual(breakdown.penalties, 0, 'No adverse flags should result in 0 penalties');
  });

  it('gracefully handles missing profile or unauthenticated user in dossier', () => {
    const issueTarget: IssueScoringTarget = {
      title: 'Update documentation for API endpoints',
      language: 'TypeScript',
      labels: ['documentation'],
    };

    const breakdown = calculateRelevanceScore(issueTarget, null);

    assert.ok(breakdown.total >= 0 && breakdown.total <= 100);
    assert.strictEqual(breakdown.langScore, 0, 'No profile language should yield 0 language score');
    assert.strictEqual(breakdown.techScore, 0, 'No profile skills should yield 0 tech score');
  });

  it('handles sparse issue with missing body, language, and topics', () => {
    const issueTarget: IssueScoringTarget = {
      title: 'Minimal issue with no body',
      labels: [],
    };

    const breakdown = calculateRelevanceScore(issueTarget, mockProfile);

    assert.ok(typeof breakdown.total === 'number');
    assert.ok(breakdown.total >= 0 && breakdown.total <= 100);
    assert.strictEqual(breakdown.langScore, 0);
    assert.strictEqual(breakdown.techScore, 0);
  });

  it('ensures breakdown total strictly respects arithmetic invariants', () => {
    const issueTarget: IssueScoringTarget = {
      title: 'Refactor GraphQL schema definitions',
      body: 'Contains wontfix deprecated field',
      labels: ['wontfix'],
      language: 'TypeScript',
      updated_at: '2020-01-01T00:00:00Z',
      comments: 50,
    };

    const breakdown = calculateRelevanceScore(issueTarget, mockProfile);

    const calculatedSum = Math.max(
      0,
      Math.min(
        100,
        breakdown.langScore +
          breakdown.techScore +
          breakdown.recencyScore +
          breakdown.competitionScore +
          breakdown.difficultyScore -
          breakdown.penalties,
      ),
    );

    assert.strictEqual(breakdown.total, calculatedSum);
    assert.ok(breakdown.penalties > 0, 'Penalties should be triggered for wontfix and stale issue');
  });

  it('verifies evaluation payload structure matches Supabase Edge contract', () => {
    const fetchedIssue = {
      id: 'issue-456',
      title: 'Fix CSS z-index stacking context in modal',
      body: 'Detailed reproduction...',
      labels: ['bug', 'ui'],
      language: 'TypeScript',
      repositoryTopics: ['react', 'ui'],
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      commentsCount: 0,
    };

    const target: IssueScoringTarget = {
      title: fetchedIssue.title,
      body: fetchedIssue.body,
      labels: fetchedIssue.labels,
      language: fetchedIssue.language,
      repository_topics: fetchedIssue.repositoryTopics,
      updated_at: fetchedIssue.updatedAt,
      created_at: fetchedIssue.createdAt,
      comments: fetchedIssue.commentsCount,
    };

    const breakdown = calculateRelevanceScore(target, mockProfile);

    const evaluationPayload = {
      issue: fetchedIssue,
      profile: mockProfile.bio,
      relevanceBreakdown: breakdown,
    };

    assert.ok(evaluationPayload.issue);
    assert.ok(evaluationPayload.profile);
    assert.ok(evaluationPayload.relevanceBreakdown);
    assert.strictEqual(evaluationPayload.relevanceBreakdown.total, breakdown.total);
    assert.strictEqual(evaluationPayload.relevanceBreakdown.langScore, 35);
  });
});
