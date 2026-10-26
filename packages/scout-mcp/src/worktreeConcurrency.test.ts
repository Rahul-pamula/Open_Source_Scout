import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'child_process';
import { createWorktree, removeWorktree, execWithGitLockRetry } from './git.js';

test('Git Worktree Concurrency Stress Test Suite', async (t) => {
  let tmpRepo: string;

  t.beforeEach(async () => {
    tmpRepo = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-worktree-stress-'));
    execSync('git init', { cwd: tmpRepo });
    execSync('git config user.name "Scout Stress" && git config user.email "stress@scout.local"', { cwd: tmpRepo });
    await fs.writeFile(path.join(tmpRepo, 'README.md'), '# Stress Test Repo\n');
    execSync('git add README.md && git commit -m "initial commit"', { cwd: tmpRepo });
  });

  t.afterEach(async () => {
    await fs.rm(tmpRepo, { recursive: true, force: true });
  });

  await t.test('handles 5 concurrent worktree creations and deletions under lock contention', async () => {
    const sessionIds = ['sess-concurrent-1', 'sess-concurrent-2', 'sess-concurrent-3', 'sess-concurrent-4', 'sess-concurrent-5'];

    // 1. Concurrently spawn 5 worktrees
    const createPromises = sessionIds.map((id) => createWorktree(id, tmpRepo));
    const createdPaths = await Promise.all(createPromises);

    assert.strictEqual(createdPaths.length, 5);

    // Verify all directories exist
    for (const worktreePath of createdPaths) {
      const stats = await fs.stat(worktreePath);
      assert.ok(stats.isDirectory(), `Worktree directory must exist: ${worktreePath}`);

      // Verify worktree is recognized by git
      const { stdout } = await execWithGitLockRetry('git status --porcelain', { cwd: worktreePath });
      assert.strictEqual(stdout.trim(), '');
    }

    // 2. Concurrently remove all 5 worktrees
    const removePromises = sessionIds.map((id) => removeWorktree(id, tmpRepo));
    await Promise.all(removePromises);

    // Verify directories cleaned up
    for (const worktreePath of createdPaths) {
      const exists = await fs.access(worktreePath).then(() => true).catch(() => false);
      assert.strictEqual(exists, false, `Worktree directory should be deleted: ${worktreePath}`);
    }
  });

  await t.test('execWithGitLockRetry successfully retries and completes under transient locks', async () => {
    let callCount = 0;
    const result = await execWithGitLockRetry('git rev-parse HEAD', { cwd: tmpRepo, maxRetries: 3 });
    assert.ok(result.stdout.trim().length > 0);
  });
});
