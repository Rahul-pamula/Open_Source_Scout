import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { validatePathBoundary, GuardrailError } from './guardrails.js';

test('Git Metadata & Hooks Tamper Protection Suite', async (t) => {
  let tmpDir: string;
  let worktree: string;

  t.beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-githooks-test-'));
    worktree = path.join(tmpDir, 'repo-worktree');
    await fs.mkdir(worktree, { recursive: true });
    await fs.mkdir(path.join(worktree, '.git', 'hooks'), { recursive: true });
  });

  t.afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  await t.test('strictly blocks write and edit access to .git/hooks directory and scripts', () => {
    const dangerousHookPaths = [
      '.git/hooks/pre-commit',
      '.git/hooks/pre-push',
      '.git/hooks/post-checkout',
      '.git/hooks/commit-msg',
      '.git/hooks/post-merge',
      '.git/hooks/pre-rebase',
      '.git/hooks/applypatch-msg',
      'submodule/.git/hooks/pre-commit',
      'packages/core/.git/hooks/post-commit',
    ];

    for (const hookPath of dangerousHookPaths) {
      assert.throws(
        () => validatePathBoundary(worktree, hookPath),
        (err: any) => {
          assert.strictEqual(err.name, 'GuardrailError');
          assert.match(err.message, /\.git directory or Git internals is strictly forbidden/);
          return true;
        },
        `Expected access to "${hookPath}" to be strictly rejected.`,
      );
    }
  });

  await t.test('strictly blocks access to .git configuration and internal state files', () => {
    const gitInternalPaths = [
      '.git/config',
      '.git/HEAD',
      '.git/index',
      '.git/description',
      '.git/info/exclude',
      '.git/objects/4b/825dc642cb6eb9a060e54bf8d69288fbee4904',
      '.git/refs/heads/main',
    ];

    for (const gitPath of gitInternalPaths) {
      assert.throws(
        () => validatePathBoundary(worktree, gitPath),
        (err: any) => {
          assert.strictEqual(err.name, 'GuardrailError');
          assert.match(err.message, /\.git directory or Git internals is strictly forbidden/);
          return true;
        },
        `Expected access to "${gitPath}" to be strictly rejected.`,
      );
    }
  });

  await t.test('safely permits legitimate Git configuration files in working directory', () => {
    const allowedProjectFiles = [
      '.gitignore',
      '.gitattributes',
      '.gitmodules',
      '.github/workflows/ci.yml',
      '.github/dependabot.yml',
      '.github/PULL_REQUEST_TEMPLATE.md',
    ];

    for (const filePath of allowedProjectFiles) {
      assert.doesNotThrow(
        () => validatePathBoundary(worktree, filePath),
        `Legitimate file "${filePath}" should not have been blocked.`,
      );
    }
  });
});
