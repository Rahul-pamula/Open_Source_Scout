import test from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';

const SubmitForReviewSchema = z.object({
  session_id: z.string().uuid(),
  pr_url: z.string().optional(),
});

const MarkBlockedSchema = z.object({
  session_id: z.string().uuid(),
  reason: z.string(),
});

test('MCP Tools Schema Validation', async (t) => {
  await t.test('submit_for_review accepts valid', () => {
    assert.doesNotThrow(() => SubmitForReviewSchema.parse({ session_id: '123e4567-e89b-12d3-a456-426614174000' }));
  });

  await t.test('submit_for_review rejects invalid', () => {
    assert.throws(() => SubmitForReviewSchema.parse({ session_id: 'invalid-uuid' }));
  });

  await t.test('mark_blocked accepts valid', () => {
    assert.doesNotThrow(() => MarkBlockedSchema.parse({ session_id: '123e4567-e89b-12d3-a456-426614174000', reason: 'blocked' }));
  });

  await t.test('mark_blocked rejects missing reason', () => {
    assert.throws(() => MarkBlockedSchema.parse({ session_id: '123e4567-e89b-12d3-a456-426614174000' }));
  });
});
