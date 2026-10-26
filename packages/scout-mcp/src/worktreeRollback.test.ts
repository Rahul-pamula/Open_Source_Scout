import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'child_process';
import { createWorktree, rollbackWorktreeCreation, generateWorktreeBranchName } from './git.js';

test('Git Worktree Creation Rollback Test Suite', async (t) => {
  let tmpRepo: string;

  t.beforeEach(async () => {
    tmpRepo = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-worktree-rollback-'));
    execSync('git init', { cwd: tmpRepo });
    execSync('git config user.name "Scout Test" && git config user.email "test@scout.local"', { cwd: tmpRepo });

    // Initial commit so HEAD exists
    await fs.writeFile(path.join(tmpRepo, 'README.md'), '# Base Repo\n');
    execSync('git add README.md && git commit -m "initial commit"', { cwd: tmpRepo });
  });

  t.afterEach(async () => {
    await fs.rm(tmpRepo, { recursive: true, force: true });
  });

  await t.test('explicit rollbackWorktreeCreation cleans up worktree directory and branch', async () => {
    const sessionId = 'rollback-session-1';
    const taskDesc = 'Fix authentication bug';
    const expectedBranch = generateWorktreeBranchName(sessionId, taskDesc);

    // Create a worktree successfully first
    const worktreePath = await createWorktree(sessionId, tmpRepo, taskDesc);
    const statBefore = await fs.stat(worktreePath);
    assert.ok(statBefore.isDirectory(), 'Worktree path should exist as a directory');

    // Verify branch exists in git repo
    const branchesBefore = execSync('git branch --list', { cwd: tmpRepo }).toString();
    assert.ok(branchesBefore.includes(expectedBranch), `Branch ${expectedBranch} should exist in repo`);

    // Call rollbackWorktreeCreation
    await rollbackWorktreeCreation(sessionId, tmpRepo, taskDesc);

    // Verify worktree directory is removed
    const existsAfter = await fs.access(worktreePath).then(() => true).catch(() => false);
    assert.strictEqual(existsAfter, false, 'Worktree directory should be deleted after rollback');

    // Verify branch is removed
    const branchesAfter = execSync('git branch --list', { cwd: tmpRepo }).toString();
    assert.ok(!branchesAfter.includes(expectedBranch), `Branch ${expectedBranch} should be deleted after rollback`);
  });

  await t.test('createWorktree rolls back cleanly when worktree creation fails', async () => {
    const sessionId = 'rollback-session-obstructed';
    const taskDesc = 'Refactor database models';
    const expectedBranch = generateWorktreeBranchName(sessionId, taskDesc);

    // Obstruct .git/worktrees with a regular file so git worktree add fails
    const gitWorktreesPath = path.join(tmpRepo, '.git', 'worktrees');
    await fs.writeFile(gitWorktreesPath, 'obstructing regular file');

    // Attempting createWorktree should fail and trigger rollback
    await assert.rejects(
      async () => {
        await createWorktree(sessionId, tmpRepo, taskDesc);
      },
      /Failed to create worktree/
    );

    // Verify branch was not left dangling in git branch list
    const branches = execSync('git branch --list', { cwd: tmpRepo }).toString();
    assert.ok(!branches.includes(expectedBranch), `Dangling branch ${expectedBranch} should be cleaned up`);

    // Clean up obstruction
    await fs.rm(gitWorktreesPath, { force: true });
  });

  await t.test('subsequent worktree creation succeeds after a rollback', async () => {
    const sessionId = 'rollback-session-recover';
    const taskDesc = 'Add search filters';
    const expectedBranch = generateWorktreeBranchName(sessionId, taskDesc);

    // Simulate partial state: manually create branch and invoke rollback
    execSync(`git branch ${expectedBranch}`, { cwd: tmpRepo });
    assert.ok(execSync('git branch --list', { cwd: tmpRepo }).toString().includes(expectedBranch));

    await rollbackWorktreeCreation(sessionId, tmpRepo, taskDesc);
    assert.ok(!execSync('git branch --list', { cwd: tmpRepo }).toString().includes(expectedBranch));

    // Now normal createWorktree should succeed without collision
    const worktreePath = await createWorktree(sessionId, tmpRepo, taskDesc);
    assert.ok(worktreePath.includes(sessionId), 'Worktree should be successfully created');
    
    // Clean up
    await rollbackWorktreeCreation(sessionId, tmpRepo, taskDesc);
  });
});
