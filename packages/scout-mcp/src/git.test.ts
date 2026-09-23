import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { getGitInfo, createWorktree, removeWorktree, cleanupOrphanedWorktrees } from './git.js';
import { saveLocalState } from './localState.js';

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

  await t.test('creates and removes worktree safely', async () => {
    execSync('git init', { cwd: testDir });
    execSync('git commit --allow-empty -m "Initial commit"', { cwd: testDir });

    const sessionId = 'test-session-123';
    const wtPath = await createWorktree(sessionId, testDir);
    
    assert.ok(fs.existsSync(wtPath));
    assert.ok(fs.existsSync(path.join(wtPath, '.git')));
    
    await removeWorktree(sessionId, testDir);
    
    assert.ok(!fs.existsSync(wtPath));
  });

  await t.test('cleans up dirty worktrees safely', async () => {
    execSync('git init', { cwd: testDir });
    execSync('git commit --allow-empty -m "Initial commit"', { cwd: testDir });

    const sessionId = 'test-session-dirty';
    const wtPath = await createWorktree(sessionId, testDir);
    
    fs.writeFileSync(path.join(wtPath, 'dirty.txt'), 'dirty');
    
    await removeWorktree(sessionId, testDir);
    
    assert.ok(!fs.existsSync(wtPath));
  });

  await t.test('concurrent worktree creation', async () => {
    execSync('git init', { cwd: testDir });
    execSync('git commit --allow-empty -m "Initial commit"', { cwd: testDir });

    const sessions = ['session-1', 'session-2', 'session-3'];
    
    // Create concurrently
    const paths = await Promise.all(
      sessions.map(id => createWorktree(id, testDir))
    );
    
    for (const p of paths) {
      assert.ok(fs.existsSync(p));
      assert.ok(fs.existsSync(path.join(p, '.git')));
    }
    
    // Cleanup concurrently
    await Promise.all(
      sessions.map(id => removeWorktree(id, testDir))
    );
    
    for (const p of paths) {
      assert.ok(!fs.existsSync(p));
    }
  });

  await t.test('cleans up orphaned worktrees safely', async () => {
    execSync('git init', { cwd: testDir });
    execSync('git commit --allow-empty -m "Initial commit"', { cwd: testDir });

    const sessionActive = 'session-active';
    const sessionOrphaned = 'session-orphaned';
    const sessionOrphanedBranch = 'session-orphaned-branch';

    const activePath = await createWorktree(sessionActive, testDir);
    const orphanedPath = await createWorktree(sessionOrphaned, testDir);
    
    execSync('git branch scout-session-' + sessionOrphanedBranch, { cwd: testDir });

    await saveLocalState({
      sessions: {
        [sessionActive]: {
          status: 'ACTIVE',
          starting_commit_hash: 'abc',
          task_description: 'test',
          source: 'manual'
        }
      }
    }, testDir);

    await cleanupOrphanedWorktrees(testDir);

    assert.ok(fs.existsSync(activePath));
    assert.ok(!fs.existsSync(orphanedPath));
    
    const branchOut = execSync('git branch --list "scout-session-*"', { cwd: testDir }).toString();
    assert.ok(!branchOut.includes(sessionOrphanedBranch));
  });
});
