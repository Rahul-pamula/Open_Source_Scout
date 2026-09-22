import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { getGitInfo, checkDirtyWorkingTree } from './git.js';

test('Git Adapter', async (t) => {
  const testDir = path.join(process.cwd(), '.test-scout-git');

  t.beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  t.afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  await t.test('fails on missing git repository', async () => {
    const originalEnv = process.env.GIT_CEILING_DIRECTORIES;
    process.env.GIT_CEILING_DIRECTORIES = path.dirname(testDir);
    try {
      await assert.rejects(() => getGitInfo(testDir), /Not a git repository/);
    } finally {
      process.env.GIT_CEILING_DIRECTORIES = originalEnv;
    }
  });

  await t.test('fails on missing origin', async () => {
    execSync('git init', { cwd: testDir });
    await assert.rejects(() => getGitInfo(testDir), /Git error:/);
  });

  await t.test('fails on detached HEAD', async () => {
    execSync('git init', { cwd: testDir });
    execSync('git remote add origin https://github.com/test/repo', { cwd: testDir });
    execSync('git commit --allow-empty -m "Initial commit"', { cwd: testDir });
    execSync('git checkout --detach HEAD', { cwd: testDir });
    await assert.rejects(() => getGitInfo(testDir), /Detached HEAD state/);
  });

  await t.test('succeeds on valid git repository', async () => {
    execSync('git init', { cwd: testDir });
    execSync('git remote add origin git@github.com:test/repo.git', { cwd: testDir });
    execSync('git checkout -b main', { cwd: testDir });
    execSync('git commit --allow-empty -m "Initial commit"', { cwd: testDir });
    
    const info = await getGitInfo(testDir);
    assert.strictEqual(info.remoteUrl, 'https://github.com/test/repo');
    assert.strictEqual(info.branch, 'main');
    assert.ok(info.commitHash.length > 0);
  });

  await t.test('clean working tree', async () => {
    execSync('git init', { cwd: testDir });
    await assert.doesNotReject(() => checkDirtyWorkingTree(testDir));
  });

  await t.test('dirty working tree', async () => {
    execSync('git init', { cwd: testDir });
    fs.writeFileSync(path.join(testDir, 'dirty.txt'), 'dirty');
    await assert.rejects(() => checkDirtyWorkingTree(testDir), /Working tree is dirty/);
  });
});
