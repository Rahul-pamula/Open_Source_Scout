import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getLabelQualifiersForLevel,
  buildGitHubSearchQuery,
  buildRelaxedGitHubSearchQuery,
  validateGitHubQuery,
  sanitizeGitHubQuery,
  MAX_GITHUB_QUERY_LENGTH,
} from './queryBuilder';

describe('queryBuilder search query synthesis', () => {
  describe('getLabelQualifiersForLevel', () => {
    it('returns good first issue qualifier for Beginner tier', () => {
      assert.deepEqual(getLabelQualifiersForLevel('Beginner'), ['label:"good first issue"']);
    });

    it('returns help wanted qualifier for Intermediate tier', () => {
      assert.deepEqual(getLabelQualifiersForLevel('Intermediate'), ['label:"help wanted"']);
    });

    it('returns empty qualifier array for Senior tier to allow broad scope', () => {
      assert.deepEqual(getLabelQualifiersForLevel('Senior'), []);
    });

    it('defaults to Beginner qualifier when level is null or undefined', () => {
      assert.deepEqual(getLabelQualifiersForLevel(null), ['label:"good first issue"']);
      assert.deepEqual(getLabelQualifiersForLevel(undefined), ['label:"good first issue"']);
    });
  });

  describe('buildGitHubSearchQuery', () => {
    it('constructs a default open issue query when no parameters are provided', () => {
      const query = buildGitHubSearchQuery();
      assert.equal(
        query,
        'is:open is:issue label:"good first issue" language:TypeScript sort:updated-desc',
      );
    });

    it('injects verified programming languages and filters out non-language frameworks', () => {
      const query = buildGitHubSearchQuery({
        skills: ['TypeScript', 'React', 'Python', 'Docker', 'Go'],
        experienceLevel: 'Beginner',
      });

      assert.ok(query.includes('is:open is:issue'));
      assert.ok(query.includes('label:"good first issue"'));
      assert.ok(query.includes('language:TypeScript'));
      assert.ok(query.includes('language:Python'));
      assert.ok(query.includes('language:Go'));
      // Frameworks and tools should never appear as language: qualifiers
      assert.ok(!query.includes('language:React'));
      assert.ok(!query.includes('language:Docker'));
    });

    it('constructs Intermediate query with help wanted label', () => {
      const query = buildGitHubSearchQuery({
        skills: ['Rust'],
        experienceLevel: 'Intermediate',
      });

      assert.ok(query.includes('label:"help wanted"'));
      assert.ok(query.includes('language:Rust'));
      assert.ok(!query.includes('label:"good first issue"'));
    });

    it('constructs Senior query without restrictive entry-level labels', () => {
      const query = buildGitHubSearchQuery({
        skills: ['Go', 'Rust'],
        experienceLevel: 'Senior',
      });

      assert.ok(!query.includes('label:"good first issue"'));
      assert.ok(!query.includes('label:"help wanted"'));
      assert.ok(query.includes('language:Go'));
      assert.ok(query.includes('language:Rust'));
      assert.ok(query.includes('sort:updated-desc'));
    });

    it('respects limitLanguages and custom state and sort parameters', () => {
      const query = buildGitHubSearchQuery({
        skills: ['Python', 'TypeScript', 'Ruby', 'Go', 'Rust'],
        experienceLevel: 'Senior',
        limitLanguages: 2,
        state: 'closed',
        sort: 'comments-desc',
      });

      assert.ok(query.startsWith('is:closed is:issue'));
      assert.ok(query.includes('language:Python language:TypeScript'));
      assert.ok(!query.includes('language:Ruby'));
      assert.ok(!query.includes('language:Go'));
      assert.ok(query.endsWith('sort:comments-desc'));
    });
  });

  describe('buildRelaxedGitHubSearchQuery', () => {
    it('constructs relaxed query defaulting to TypeScript with no label filters', () => {
      const relaxed = buildRelaxedGitHubSearchQuery();
      assert.equal(relaxed, 'is:open is:issue language:TypeScript sort:updated-desc');
    });

    it('relaxes constraints to top language and omits entry-level label for Beginner', () => {
      const relaxed = buildRelaxedGitHubSearchQuery({
        skills: ['Python', 'Go', 'React'],
        experienceLevel: 'Beginner',
      });

      assert.equal(relaxed, 'is:open is:issue language:Python sort:updated-desc');
      assert.ok(!relaxed.includes('label:'));
    });

    it('falls back to TypeScript when user only specifies frameworks without languages', () => {
      const relaxed = buildRelaxedGitHubSearchQuery({
        skills: ['React', 'Next.js', 'TailwindCSS'],
        experienceLevel: 'Intermediate',
      });

      assert.equal(relaxed, 'is:open is:issue language:TypeScript sort:updated-desc');
    });

    it('respects custom state and sort options in relaxed queries', () => {
      const relaxed = buildRelaxedGitHubSearchQuery({
        skills: ['Rust'],
        state: 'closed',
        sort: 'reactions-desc',
      });

      assert.equal(relaxed, 'is:closed is:issue language:Rust sort:reactions-desc');
    });
  });

  describe('validateGitHubQuery & sanitizeGitHubQuery', () => {
    it('validates compliant standard queries', () => {
      const query =
        'is:open is:issue label:"good first issue" language:TypeScript sort:updated-desc';
      const result = validateGitHubQuery(query);
      assert.equal(result.isValid, true);
      assert.equal(result.errors.length, 0);
    });

    it('flags empty query as invalid', () => {
      const result = validateGitHubQuery('');
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('empty')));
    });

    it('flags query exceeding 256 characters', () => {
      const longQuery = 'language:TypeScript '.repeat(20);
      const result = validateGitHubQuery(longQuery);
      assert.equal(result.isValid, false);
      assert.ok(
        result.errors.some((e) => e.includes('exceeds maximum allowable GitHub search length')),
      );
    });

    it('flags excessive language qualifiers (> 5)', () => {
      const tooManyLangs =
        'is:open is:issue language:Go language:Rust language:Python language:TypeScript language:Ruby language:C++';
      const result = validateGitHubQuery(tooManyLangs);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('exceeding limit of 5')));
    });

    it('sanitizes oversized query strings to stay within character limits', () => {
      const longQuery =
        'is:open is:issue language:Go language:Rust language:Python language:TypeScript language:Ruby language:Java sort:updated-desc';
      const sanitized = sanitizeGitHubQuery(longQuery, 80);
      assert.ok(sanitized.length <= 80);
      assert.ok(sanitized.startsWith('is:open is:issue'));
    });
  });
});
