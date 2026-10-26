import test from 'node:test';
import assert from 'node:assert';
import { toSessionId, toWorkspacePath, toCommitHash } from './brands.js';

test('Brand Types Validation', async (t) => {
  await t.test('toSessionId converts valid string and rejects empty', () => {
    const id = toSessionId('123e4567-e89b-12d3-a456-426614174000');
    assert.strictEqual(id, '123e4567-e89b-12d3-a456-426614174000');
    assert.throws(() => toSessionId(''), /TypeError/);
    assert.throws(() => toSessionId('   '), /TypeError/);
    assert.throws(() => toSessionId(null as any), /TypeError/);
  });

  await t.test('toWorkspacePath converts valid string and rejects empty', () => {
    const p = toWorkspacePath('/tmp/scout-worktree');
    assert.strictEqual(p, '/tmp/scout-worktree');
    assert.throws(() => toWorkspacePath(''), /TypeError/);
    assert.throws(() => toWorkspacePath('   '), /TypeError/);
  });

  await t.test('toCommitHash converts valid string and rejects empty', () => {
    const hash = toCommitHash('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    assert.strictEqual(hash, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    assert.throws(() => toCommitHash(''), /TypeError/);
  });
});
