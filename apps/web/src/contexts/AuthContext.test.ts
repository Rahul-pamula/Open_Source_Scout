import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeExperienceLevel, type UserProfile } from '../types/user';

describe('AuthContext profile & experience level parsing', () => {
  describe('normalizeExperienceLevel', () => {
    it('preserves valid experience levels', () => {
      assert.equal(normalizeExperienceLevel('Beginner'), 'Beginner');
      assert.equal(normalizeExperienceLevel('Intermediate'), 'Intermediate');
      assert.equal(normalizeExperienceLevel('Senior'), 'Senior');
    });

    it('falls back to Beginner for null or undefined', () => {
      assert.equal(normalizeExperienceLevel(null), 'Beginner');
      assert.equal(normalizeExperienceLevel(undefined), 'Beginner');
    });

    it('falls back to Beginner for arbitrary or invalid strings', () => {
      assert.equal(normalizeExperienceLevel(''), 'Beginner');
      assert.equal(normalizeExperienceLevel('expert'), 'Beginner');
      assert.equal(normalizeExperienceLevel('junior'), 'Beginner');
      assert.equal(normalizeExperienceLevel(123), 'Beginner');
    });
  });

  describe('UserProfile structure', () => {
    it('instantiates valid UserProfile with experience_level', () => {
      const profile: UserProfile = {
        bio: 'Fullstack developer',
        skills: ['typescript', 'react'],
        github_handle: 'testdev',
        automation_count_today: 0,
        last_automation_date: '2026-10-25',
        custom_comment_enabled: false,
        custom_comment_text: null,
        experience_level: 'Intermediate',
      };

      assert.equal(profile.experience_level, 'Intermediate');
      assert.equal(profile.skills.length, 2);
    });

    it('allows experience_level to be optional on UserProfile', () => {
      const legacyProfile: UserProfile = {
        bio: '',
        skills: [],
        github_handle: 'legacy',
        automation_count_today: 0,
        last_automation_date: '',
        custom_comment_enabled: false,
        custom_comment_text: null,
      };

      assert.equal(legacyProfile.experience_level, undefined);
      assert.equal(normalizeExperienceLevel(legacyProfile.experience_level), 'Beginner');
    });
  });
});
