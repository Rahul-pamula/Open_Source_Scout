import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLanguageScore,
  calculateTechScore,
  calculateRecencyScore,
  calculateCompetitionScore,
  calculateDifficultyScore,
  calculatePenalties,
  calculateRelevanceScore,
} from './relevanceScorer';
import type { IssueScoringTarget } from '../types/relevance';
import type { UserProfile } from '../types/user';

describe('relevanceScorer unit tests', () => {
  const referenceDate = new Date('2026-10-25T12:00:00Z');

  describe('calculateLanguageScore', () => {
    it('awards full score (35) for exact primary language match', () => {
      const target: IssueScoringTarget = {
        title: 'Fix button style',
        language: 'TypeScript',
      };
      const score = calculateLanguageScore(target, ['TypeScript', 'JavaScript']);
      assert.strictEqual(score, 35);
    });

    it('awards 85% score (~30) for language mention in labels', () => {
      const target: IssueScoringTarget = {
        title: 'Add dark mode',
        language: 'Other',
        labels: [{ name: 'python' }],
      };
      const score = calculateLanguageScore(target, ['Python']);
      assert.strictEqual(score, 30);
    });

    it('awards 60% score (~21) for language mention in title or snippet', () => {
      const target: IssueScoringTarget = {
        title: 'Refactor Rust backend query',
        language: null,
      };
      const score = calculateLanguageScore(target, ['Rust']);
      assert.strictEqual(score, 21);
    });

    it('returns 0 for no language match or empty user languages', () => {
      const target: IssueScoringTarget = {
        title: 'Doc fix',
        language: 'Go',
      };
      assert.strictEqual(calculateLanguageScore(target, ['Python']), 0);
      assert.strictEqual(calculateLanguageScore(target, []), 0);
    });
  });

  describe('calculateTechScore', () => {
    it('awards full score (25) when 2 or more frameworks/tools match', () => {
      const target: IssueScoringTarget = {
        title: 'Upgrade React and Tailwind dependencies',
        repository_topics: ['react', 'tailwindcss'],
      };
      const score = calculateTechScore(target, ['React', 'Tailwind']);
      assert.strictEqual(score, 25);
    });

    it('awards 75% score (19) when 1 framework matches', () => {
      const target: IssueScoringTarget = {
        title: 'Add Redis caching layer',
        repository_topics: ['redis'],
      };
      const score = calculateTechScore(target, ['Redis']);
      assert.strictEqual(score, 19);
    });

    it('matches frameworks mentioned in labels or text', () => {
      const target: IssueScoringTarget = {
        title: 'Setup Docker container build',
        body: 'Create a Dockerfile for deployment',
      };
      const score = calculateTechScore(target, ['Docker']);
      assert.strictEqual(score, 19);
    });

    it('returns 0 when no technologies match', () => {
      const target: IssueScoringTarget = {
        title: 'Simple documentation fix',
      };
      assert.strictEqual(calculateTechScore(target, ['Django']), 0);
    });
  });

  describe('calculateRecencyScore', () => {
    it('awards 15 points for issues updated within 7 days', () => {
      const target: IssueScoringTarget = {
        title: 'Recent issue',
        updated_at: '2026-10-23T12:00:00Z', // 2 days ago
      };
      assert.strictEqual(calculateRecencyScore(target, referenceDate), 15);
    });

    it('awards 12 points for issues updated between 7 and 30 days', () => {
      const target: IssueScoringTarget = {
        title: 'Monthly issue',
        updated_at: '2026-10-10T12:00:00Z', // 15 days ago
      };
      assert.strictEqual(calculateRecencyScore(target, referenceDate), 12);
    });

    it('awards 8 points for issues updated between 30 and 90 days', () => {
      const target: IssueScoringTarget = {
        title: 'Quarterly issue',
        updated_at: '2026-08-25T12:00:00Z', // ~61 days ago
      };
      assert.strictEqual(calculateRecencyScore(target, referenceDate), 8);
    });

    it('awards 4 points for issues updated between 90 and 180 days', () => {
      const target: IssueScoringTarget = {
        title: 'Old issue',
        updated_at: '2026-06-01T12:00:00Z', // ~146 days ago
      };
      assert.strictEqual(calculateRecencyScore(target, referenceDate), 4);
    });

    it('returns 0 for issues older than 180 days or missing date', () => {
      const target: IssueScoringTarget = {
        title: 'Ancient issue',
        updated_at: '2025-01-01T12:00:00Z',
      };
      assert.strictEqual(calculateRecencyScore(target, referenceDate), 0);
      assert.strictEqual(calculateRecencyScore({ title: 'No date' }, referenceDate), 0);
    });
  });

  describe('calculateCompetitionScore', () => {
    it('awards 15 points for 0 comments (unclaimed opportunity)', () => {
      assert.strictEqual(calculateCompetitionScore({ title: 'Open', comments: 0 }), 15);
    });

    it('awards 13 points for 1 comment', () => {
      assert.strictEqual(calculateCompetitionScore({ title: 'Open', comments: 1 }), 13);
    });

    it('awards 10 points for 2 comments', () => {
      assert.strictEqual(calculateCompetitionScore({ title: 'Open', comments: 2 }), 10);
    });

    it('awards 6 points for 3-5 comments', () => {
      assert.strictEqual(calculateCompetitionScore({ title: 'Open', comments: 4 }), 6);
    });

    it('awards 2 points for heavily commented issues (>5 comments)', () => {
      assert.strictEqual(calculateCompetitionScore({ title: 'Open', comments: 12 }), 2);
    });
  });

  describe('calculateDifficultyScore', () => {
    it('awards 10 points for Beginner with good-first-issue label', () => {
      const target: IssueScoringTarget = {
        title: 'Fix typo',
        labels: [{ name: 'good first issue' }],
      };
      assert.strictEqual(calculateDifficultyScore(target, 'Beginner'), 10);
    });

    it('awards 10 points for Senior with architecture / RFC issue', () => {
      const target: IssueScoringTarget = {
        title: 'RFC: Event-driven architecture rewrite',
        labels: [{ name: 'architecture' }],
      };
      assert.strictEqual(calculateDifficultyScore(target, 'Senior'), 10);
    });

    it('awards 10 points for Intermediate with help wanted / bug / feature', () => {
      const target: IssueScoringTarget = {
        title: 'Fix memory leak in parser',
        labels: [{ name: 'bug' }, { name: 'help wanted' }],
      };
      assert.strictEqual(calculateDifficultyScore(target, 'Intermediate'), 10);
    });
  });

  describe('calculatePenalties', () => {
    it('deducts 50 points for wontfix or invalid markers', () => {
      const target: IssueScoringTarget = {
        title: 'Cannot reproduce error',
        labels: [{ name: 'wontfix' }],
      };
      assert.strictEqual(calculatePenalties(target, referenceDate), 50);
    });

    it('deducts 25 points for inactive repo (> 365 days)', () => {
      const target: IssueScoringTarget = {
        title: 'Old repo issue',
        last_repo_activity_date: '2024-01-01T00:00:00Z',
      };
      assert.strictEqual(calculatePenalties(target, referenceDate), 25);
    });

    it('deducts 10 points for comment overload (> 25 comments)', () => {
      const target: IssueScoringTarget = {
        title: 'Controversial issue',
        comments: 32,
      };
      assert.strictEqual(calculatePenalties(target, referenceDate), 10);
    });
  });

  describe('calculateRelevanceScore aggregate pipeline', () => {
    it('calculates 100/100 score for ideal matching issue', () => {
      const target: IssueScoringTarget = {
        title: 'Add responsive navbar in React',
        language: 'TypeScript',
        repository_topics: ['react', 'tailwindcss'],
        updated_at: '2026-10-23T12:00:00Z',
        comments: 0,
        labels: [{ name: 'good first issue' }],
      };

      const profile: Partial<UserProfile> = {
        skills: ['TypeScript', 'React', 'Tailwind'],
        experience_level: 'Beginner',
      };

      const breakdown = calculateRelevanceScore(target, profile, undefined, referenceDate);
      assert.strictEqual(breakdown.langScore, 35);
      assert.strictEqual(breakdown.techScore, 25);
      assert.strictEqual(breakdown.recencyScore, 15);
      assert.strictEqual(breakdown.competitionScore, 15);
      assert.strictEqual(breakdown.difficultyScore, 10);
      assert.strictEqual(breakdown.penalties, 0);
      assert.strictEqual(breakdown.total, 100);
    });

    it('clamps total score between 0 and 100 when penalties exceed raw points', () => {
      const target: IssueScoringTarget = {
        title: 'Abandoned bug report',
        labels: [{ name: 'wontfix' }],
        last_repo_activity_date: '2023-01-01T00:00:00Z',
      };

      const profile: Partial<UserProfile> = {
        skills: ['Python'],
        experience_level: 'Senior',
      };

      const breakdown = calculateRelevanceScore(target, profile, undefined, referenceDate);
      assert.strictEqual(breakdown.total, 0);
      assert.ok(breakdown.penalties >= 75);
    });

    it('handles null profile gracefully with safe defaults', () => {
      const target: IssueScoringTarget = {
        title: 'Generic open issue',
        comments: 1,
        updated_at: '2026-10-24T12:00:00Z',
      };

      const breakdown = calculateRelevanceScore(target, null, undefined, referenceDate);
      assert.strictEqual(breakdown.langScore, 0);
      assert.strictEqual(breakdown.techScore, 0);
      assert.strictEqual(breakdown.recencyScore, 15);
      assert.strictEqual(breakdown.competitionScore, 13);
      assert.ok(breakdown.total > 0);
    });
  });
});
