import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultUserProfile,
  normalizeExperienceLevel,
  type ExperienceLevel,
  type UserProfile,
} from '../types/user';
import { buildProfileUpdatePayload } from '../services/profileService';

describe('Profile Lifecycle & Experience Level Integration', () => {
  it('initializes a fresh unauthenticated or null user with default Beginner profile', () => {
    const profile = createDefaultUserProfile(null);
    assert.equal(profile.experience_level, 'Beginner');
    assert.deepEqual(profile.skills, []);
    assert.equal(profile.github_handle, '');
    assert.equal(profile.automation_count_today, 0);
  });

  it('progresses through all experience levels: Beginner -> Intermediate -> Senior', () => {
    let currentProfile: UserProfile = createDefaultUserProfile({
      id: 'usr_123',
      user_metadata: { user_name: 'testuser' },
    });

    assert.equal(currentProfile.experience_level, 'Beginner');

    const levels: ExperienceLevel[] = ['Beginner', 'Intermediate', 'Senior'];
    for (const targetLevel of levels) {
      const payload = buildProfileUpdatePayload({ experience_level: targetLevel });
      currentProfile = {
        ...currentProfile,
        experience_level: normalizeExperienceLevel(payload.experience_level),
      };
      assert.equal(currentProfile.experience_level, targetLevel);
    }
  });

  it('preserves skills when updating experience tier', () => {
    const initialProfile: UserProfile = {
      bio: 'Full Stack Engineer',
      skills: ['TypeScript', 'React', 'Node.js', 'Go'],
      github_handle: 'senior_dev',
      automation_count_today: 5,
      last_automation_date: '2026-10-25',
      custom_comment_enabled: true,
      custom_comment_text: 'Looking forward to contributing!',
      experience_level: 'Intermediate',
    };

    const updatePayload = buildProfileUpdatePayload({ experience_level: 'Senior' });
    const updatedProfile: UserProfile = {
      ...initialProfile,
      ...updatePayload,
    };

    assert.equal(updatedProfile.experience_level, 'Senior');
    assert.deepEqual(updatedProfile.skills, ['TypeScript', 'React', 'Node.js', 'Go']);
    assert.equal(updatedProfile.custom_comment_enabled, true);
  });

  it('handles downgrading experience tier and preserves state', () => {
    const initialProfile: UserProfile = {
      bio: 'Lifelong learner',
      skills: ['Python'],
      github_handle: 'py_learner',
      automation_count_today: 0,
      last_automation_date: '2026-10-25',
      custom_comment_enabled: false,
      custom_comment_text: null,
      experience_level: 'Senior',
    };

    const payload = buildProfileUpdatePayload({ experience_level: 'Beginner' });
    const updated: UserProfile = {
      ...initialProfile,
      ...payload,
    };

    assert.equal(updated.experience_level, 'Beginner');
    assert.deepEqual(updated.skills, ['Python']);
  });

  it('safely handles legacy or unexpected database values during lifecycle fetching', () => {
    const rawDbResponses = [
      { rawLevel: null, expected: 'Beginner' },
      { rawLevel: undefined, expected: 'Beginner' },
      { rawLevel: 'Senior', expected: 'Senior' },
      { rawLevel: 'Intermediate', expected: 'Intermediate' },
      { rawLevel: 'unknown_tier', expected: 'Beginner' },
    ];

    for (const { rawLevel, expected } of rawDbResponses) {
      const parsed = normalizeExperienceLevel(rawLevel);
      assert.equal(parsed, expected);
    }
  });
});
