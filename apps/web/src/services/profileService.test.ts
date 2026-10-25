import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildProfileUpdatePayload } from './profileService';

describe('profileService', () => {
  describe('buildProfileUpdatePayload', () => {
    it('constructs partial payload with only specified fields', () => {
      const payload = buildProfileUpdatePayload({
        bio: 'Open source enthusiast',
        skills: ['TypeScript', 'Rust'],
      });

      assert.equal(payload.bio, 'Open source enthusiast');
      assert.deepEqual(payload.skills, ['TypeScript', 'Rust']);
      assert.equal(payload.github_handle, undefined);
      assert.equal(payload.experience_level, undefined);
      assert.ok(payload.updated_at);
    });

    it('normalizes experience_level when provided', () => {
      const payloadSenior = buildProfileUpdatePayload({
        experience_level: 'Senior',
      });
      assert.equal(payloadSenior.experience_level, 'Senior');

      const payloadUnknown = buildProfileUpdatePayload({
        experience_level: 'Wizard' as any,
      });
      assert.equal(payloadUnknown.experience_level, 'Beginner');
    });

    it('handles custom comments configuration', () => {
      const payload = buildProfileUpdatePayload({
        custom_comment_enabled: true,
        custom_comment_text: 'Excited to contribute to this repo!',
      });

      assert.equal(payload.custom_comment_enabled, true);
      assert.equal(payload.custom_comment_text, 'Excited to contribute to this repo!');
    });
  });
});
