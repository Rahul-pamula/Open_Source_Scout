import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'child_process';
import { listWorktrees, createWorktree, removeWorktree } from './git.js';

test('Git listWorktrees Utility Test Suite', async (t) => {
  let tmpRepo: string;

  t.beforeEach(async () => {
    tmpRepo = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-list-worktrees-'));
    execSync('git init', { cwd: tmpRepo });
    execSync('git config user.name "Scout Test" && git config user.email "test@scout.local"', { cwd: tmpRepo });

    // Initial commit so HEAD exists
    await fs.writeFile(path.join(tmpRepo, 'README.md'), '# Base Repo\n');
    execSync('git add README.md && git commit -m "initial commit"', { cwd: tmpRepo });
  });

  t.afterEach(async () => {
    await fs.rm(tmpRepo, { recursive: true, force: true });
  });

  await t.test('lists main repository worktree initially', async () => {
    const worktrees = await listWorktrees(tmpRepo);
    assert.ok(worktrees.length >= 1, 'Should list at least the main worktree');
    
    const root = worktrees[0];
    assert.ok(root.path.length > 0, 'Path should not be empty');
    assert.ok(root.head.length > 0, 'Head commit hash should not be empty');
    assert.ok(!root.isScoutSession, 'Root worktree should not be flagged as a Scout session');
  });

  await t.test('detects Scout session worktrees with session ID and branch metadata', async () => {
    const sessionId = 'test-session-123';
    const taskDesc = 'Fix authentication header bug';

    const worktreePath = await createWorktree(sessionId, tmpRepo, taskDesc);
    assert.ok(worktreePath, 'Worktree should be created');

    const worktrees = await listWorktrees(tmpRepo);
    assert.strictEqual(worktrees.length, 2, 'Should now have 2 worktrees (root + scout session)');

    const scoutWorktree = worktrees.find((w) => w.isScoutSession);
    assert.ok(scoutWorktree, 'Should find scout session worktree');
    assert.strictEqual(scoutWorktree.sessionId, sessionId, 'Session ID should match');
    assert.ok(scoutWorktree.branch?.startsWith('scout/'), 'Branch name should start with scout/');
    assert.ok(scoutWorktree.path.includes(sessionId), 'Worktree path should include sessionId');

    // Clean up
    await removeWorktree(sessionId, tmpRepo, taskDesc);
    const worktreesAfter = await listWorktrees(tmpRepo);
    assert.strictEqual(worktreesAfter.length, 1, 'Should return to 1 worktree after cleanup');
  });

  await t.test('detects detached and locked worktree metadata', async () => {
    const detachedDir = path.join(tmpRepo, '.scout-tmp', 'detached-test');
    await fs.mkdir(path.dirname(detachedDir), { recursive: true });

    // Create detached worktree
    execSync(`git worktree add --detach ${detachedDir} HEAD`, { cwd: tmpRepo });

    // Lock the detached worktree
    execSync(`git worktree lock --reason "manual audit lock" ${detachedDir}`, { cwd: tmpRepo });

    const worktrees = await listWorktrees(tmpRepo);
    const target = worktrees.find((w) => w.path.includes('detached-test'));

    assert.ok(target, 'Should locate detached worktree');
    assert.strictEqual(target.isDetached, true, 'isDetached should be true');
    assert.strictEqual(target.isLocked, true, 'isLocked should be true');
    assert.strictEqual(target.lockReason, 'manual audit lock', 'lockReason should match');

    // Unlock and remove
    execSync(`git worktree unlock ${detachedDir}`, { cwd: tmpRepo });
    execSync(`git worktree remove --force ${detachedDir}`, { cwd: tmpRepo });
  });

  await t.test('gracefully returns empty array on invalid or non-git directory', async () => {
    const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-non-git-'));
    try {
      const worktrees = await listWorktrees(emptyDir);
      assert.deepStrictEqual(worktrees, [], 'Should return empty array when not a git repository');
    } finally {
      await fs.rm(emptyDir, { recursive: true, force: true });
    }
  });
});
