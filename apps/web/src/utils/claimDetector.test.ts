import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLAIM_INTENT_REGEX,
  evaluateCommentContestation,
  type ContestationAssessment,
} from './claimDetector';

describe('claimDetector comment heuristic scanner', () => {
  describe('CLAIM_INTENT_REGEX patterns', () => {
    it('detects common verbal claim phrasing', () => {
      const phrases = [
        "Hi! I'd like to pick this up, starting with LND-REST",
        'I would like to work on this issue please',
        'Can I take this?',
        'Please assign this to me',
        'Assign me please',
        'Working on a PR now',
        'Working on a fix for this bug',
        'taking this up!',
        'PR incoming shortly',
        'claim this issue',
        'can I work on this',
        'can I have this',
      ];

      for (const phrase of phrases) {
        assert.ok(CLAIM_INTENT_REGEX.test(phrase), `Expected regex match for: "${phrase}"`);
      }
    });

    it('ignores general inquiries, clarifications, and maintainer feedback', () => {
      const benignPhrases = [
        'Could you provide steps to reproduce this on macOS?',
        'This might be related to issue #102.',
        'Which version of Node are you using?',
        'Thanks for reporting, we will look into it.',
        'Can you add more details to the logs?',
        'Great catch! Let us know if you find more info.',
      ];

      for (const phrase of benignPhrases) {
        assert.ok(
          !CLAIM_INTENT_REGEX.test(phrase),
          `Expected NO match for benign phrase: "${phrase}"`,
        );
      }
    });
  });

  describe('evaluateCommentContestation', () => {
    it('evaluates 0 comments as 100% fresh and uncontested', () => {
      const assessment: ContestationAssessment = evaluateCommentContestation(0, []);
      assert.strictEqual(assessment.level, 'uncontested');
      assert.strictEqual(assessment.isContested, false);
      assert.strictEqual(assessment.confidence, 1.0);
      assert.ok(assessment.reason.includes('0 comments'));
    });

    it('evaluates low comments with benign discussion as low-competition', () => {
      const comments = [
        {
          id: 'c1',
          author: 'maintainer1',
          body: 'Thanks for filing! Can you share reproduction repo?',
          createdAt: '2026-11-01T00:00:00Z',
          updatedAt: '2026-11-01T00:00:00Z',
        },
      ];
      const assessment = evaluateCommentContestation(1, comments);
      assert.strictEqual(assessment.level, 'low-competition');
      assert.strictEqual(assessment.isContested, false);
      assert.ok(assessment.reason.includes('general discussion'));
    });

    it('flags issue as contested when verbal claim is detected in comments', () => {
      const comments = [
        {
          id: 'c1',
          author: 'bavarianway',
          body: "Hi! I'd like to pick this up, starting with LND-REST: Pydantic models for responses",
          createdAt: '2026-11-04T00:00:00Z',
          updatedAt: '2026-11-04T00:00:00Z',
        },
      ];
      const assessment = evaluateCommentContestation(1, comments);
      assert.strictEqual(assessment.level, 'contested');
      assert.strictEqual(assessment.isContested, true);
      assert.strictEqual(assessment.claimant, 'bavarianway');
      assert.ok(assessment.matchedPhrase?.toLowerCase().includes("i'd like to pick this up"));
      assert.ok(assessment.reason.includes('@bavarianway'));
    });

    it('flags issue as contested if officially assigned regardless of comments', () => {
      const assessment = evaluateCommentContestation(0, [], true);
      assert.strictEqual(assessment.level, 'contested');
      assert.strictEqual(assessment.isContested, true);
      assert.strictEqual(assessment.confidence, 1.0);
      assert.ok(assessment.reason.includes('officially assigned'));
    });

    it('flags issue as contested when comments count exceeds low-competition threshold', () => {
      const assessment = evaluateCommentContestation(5, []);
      assert.strictEqual(assessment.level, 'contested');
      assert.strictEqual(assessment.isContested, true);
      assert.ok(assessment.reason.includes('5 comments present'));
    });
  });
});
