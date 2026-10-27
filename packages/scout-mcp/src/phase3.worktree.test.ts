import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'child_process';
import {
  createWorktree,
  removeWorktree,
  autoPruneWorktreesOnStartup,
  checkWorktreeDiskUsage,
  getGitDiff,
  listWorktrees,
  generateWorktreeBranchName,
} from './git.js';

test('Phase 3 Complete Git & Worktree Stress Suite', async (t) => {
  let tmpRepo: string;

  t.beforeEach(async () => {
    tmpRepo = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-phase3-suite-'));
    execSync('git init', { cwd: tmpRepo });
    execSync('git config user.name "Scout Phase3" && git config user.email "phase3@scout.local"', { cwd: tmpRepo });

    await fs.writeFile(path.join(tmpRepo, 'README.md'), '# Phase 3 Test Repository\n');
    execSync('git add README.md && git commit -m "initial commit"', { cwd: tmpRepo });
  });

  t.afterEach(async () => {
    await fs.rm(tmpRepo, { recursive: true, force: true });
  });

  await t.test('1. Concurrently allocates and tears down multiple worktrees under load', async () => {
    const sessionCount = 4;
    const sessionIds = Array.from({ length: sessionCount }, (_, i) => `phase3-conc-${i + 1}`);

    // Create in parallel
    const paths = await Promise.all(
      sessionIds.map((id, idx) => createWorktree(id, tmpRepo, `Task parallel job ${idx + 1}`))
    );

    assert.strictEqual(paths.length, sessionCount);
    for (const p of paths) {
      const exists = await fs.access(p).then(() => true).catch(() => false);
      assert.strictEqual(exists, true, `Worktree directory ${p} must exist`);
    }

    // Audit using listWorktrees
    const active = await listWorktrees(tmpRepo);
    const scoutWorktrees = active.filter((w) => w.isScoutSession);
    assert.strictEqual(scoutWorktrees.length, sessionCount, 'All parallel worktrees should be audited');

    // Remove concurrently
    await Promise.all(sessionIds.map((id, idx) => removeWorktree(id, tmpRepo, `Task parallel job ${idx + 1}`)));

    const remaining = await listWorktrees(tmpRepo);
    const remainingScout = remaining.filter((w) => w.isScoutSession);
    assert.strictEqual(remainingScout.length, 0, 'All scout worktrees should be cleaned up');
  });

  await t.test('2. Automatically prunes detached and orphaned worktrees', async () => {
    // Manually create an orphaned directory inside .scout-tmp/worktrees
    const orphanSession = 'orphan-session-999';
    const orphanWorktree = path.join(tmpRepo, '.scout-tmp', 'worktrees', orphanSession);
    await fs.mkdir(orphanWorktree, { recursive: true });
    await fs.writeFile(path.join(orphanWorktree, 'orphan.txt'), 'abandoned files');

    // Manually create an orphaned scout branch
    execSync(`git branch scout-session-${orphanSession}`, { cwd: tmpRepo });

    // Run autoPruneWorktreesOnStartup
    const result = await autoPruneWorktreesOnStartup(tmpRepo);
    assert.strictEqual(result.pruned, true, 'autoPrune should succeed');

    // Verify orphan branch and directory are removed
    const branches = execSync('git branch --list', { cwd: tmpRepo }).toString();
    assert.ok(!branches.includes(orphanSession), 'Orphan branch must be pruned');

    const dirExists = await fs.access(orphanWorktree).then(() => true).catch(() => false);
    assert.strictEqual(dirExists, false, 'Orphan worktree directory must be removed');
  });

  await t.test('3. Accurately reports disk telemetry and warning thresholds', async () => {
    const sessionId = 'disk-telemetry-session';
    const worktreePath = await createWorktree(sessionId, tmpRepo, 'Disk monitoring test');

    // Write a ~2 MB test file in the worktree
    const sampleData = Buffer.alloc(2 * 1024 * 1024, 'x');
    await fs.writeFile(path.join(worktreePath, 'bigfile.bin'), sampleData);

    const telemetry = await checkWorktreeDiskUsage(sessionId, tmpRepo, 1); // 1 MB warning threshold
    assert.ok(telemetry.sizeBytes >= 2 * 1024 * 1024, 'Calculated size should reflect written bytes');
    assert.ok(telemetry.warning, 'Warning should be triggered when threshold is exceeded');
    assert.ok(telemetry.warning?.includes('exceeds recommended warning threshold'), 'Warning message format should match');

    await removeWorktree(sessionId, tmpRepo, 'Disk monitoring test');
  });

  await t.test('4. Captures newly authored untracked files in diffs using intent-to-add', async () => {
    const sessionId = 'diff-evidence-session';
    const worktreePath = await createWorktree(sessionId, tmpRepo, 'Diff evidence test');

    // Add untracked files in worktree
    await fs.writeFile(path.join(worktreePath, 'Component.tsx'), 'export const Component = () => <div>Hello</div>;\n');

    const diff = await getGitDiff(worktreePath);
    assert.ok(diff.includes('diff --git a/Component.tsx b/Component.tsx'), 'Diff must contain Component.tsx');
    assert.ok(diff.includes('+export const Component = () => <div>Hello</div>;'), 'Diff must contain file additions');

    await removeWorktree(sessionId, tmpRepo, 'Diff evidence test');
  });

  await t.test('5. Validates deterministic branch slug generation', () => {
    const sessionId = 'abcd1234efgh5678';
    const branchWithSlug = generateWorktreeBranchName(sessionId, 'Fix critical OAuth2 token expiration!');
    assert.strictEqual(branchWithSlug, 'scout/abcd1234-fix-critical-oauth2-token-expi');

    const branchWithoutSlug = generateWorktreeBranchName(sessionId);
    assert.strictEqual(branchWithoutSlug, `scout-session-${sessionId}`);
  });
});
