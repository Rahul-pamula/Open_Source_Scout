import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateRelevanceScore } from './relevanceScorer';
import type { IssueScoringTarget } from '../types/relevance';
import type { UserProfile } from '../types/user';

describe('relevanceScorer performance benchmark and stress test', () => {
  it('evaluates 1,000 issues against a multi-skill profile in under 100ms', () => {
    const profile: Partial<UserProfile> = {
      skills: [
        'TypeScript',
        'JavaScript',
        'Python',
        'Rust',
        'React',
        'Next.js',
        'FastAPI',
        'Docker',
        'Tailwind',
        'PostgreSQL',
      ],
      experience_level: 'Intermediate',
    };

    const mockCandidates: IssueScoringTarget[] = Array.from({ length: 1000 }, (_, i) => ({
      title: `Issue #${i}: Fix critical performance bottleneck in core architecture`,
      body: `Detailed reproduction steps and stack trace for issue #${i}. Mentioning React and TypeScript.`,
      language: i % 2 === 0 ? 'TypeScript' : i % 3 === 0 ? 'Python' : 'Go',
      labels: [
        { name: i % 4 === 0 ? 'help wanted' : 'bug' },
        { name: i % 5 === 0 ? 'react' : 'backend' },
      ],
      repository_topics: ['react', 'typescript', 'docker'],
      updated_at: new Date(Date.now() - (i % 60) * 86400000).toISOString(),
      created_at: new Date(Date.now() - (i % 90) * 86400000).toISOString(),
      comments: i % 15,
      last_repo_activity_date: new Date().toISOString(),
    }));

    const start = performance.now();
    for (const target of mockCandidates) {
      const breakdown = calculateRelevanceScore(target, profile);
      assert.ok(breakdown.total >= 0 && breakdown.total <= 100);
    }
    const duration = performance.now() - start;

    // Assert that 1,000 evaluations complete in well under 100ms (averaging < 0.1ms per evaluation)
    assert.ok(
      duration < 100,
      `Expected 1,000 evaluations to complete in < 100ms, but took ${duration.toFixed(2)}ms`,
    );
  });
});
