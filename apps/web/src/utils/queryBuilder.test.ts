import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getLabelQualifiersForLevel, buildGitHubSearchQuery } from './queryBuilder';

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
});
