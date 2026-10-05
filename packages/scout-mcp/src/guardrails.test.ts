import test from 'node:test';
import assert from 'node:assert';
import { CommandBoundaryGuard } from './guardrails.js';

test('CommandBoundaryGuard', async (t) => {
  await t.test('legitimate commands allowed', () => {
    assert.doesNotThrow(() => CommandBoundaryGuard.validate('ls -la'));
    assert.doesNotThrow(() => CommandBoundaryGuard.validate('echo hello'));
    assert.doesNotThrow(() => CommandBoundaryGuard.validate('cd src'));
    assert.doesNotThrow(() => CommandBoundaryGuard.validate('cd src/components'));
    assert.doesNotThrow(() => CommandBoundaryGuard.validate('cd ./src'));
    assert.doesNotThrow(() => CommandBoundaryGuard.validate('cd src && npm run build'));
    assert.doesNotThrow(() => CommandBoundaryGuard.validate('cd foo; ls'));
  });

  await t.test('escape patterns blocked', () => {
    assert.throws(() => CommandBoundaryGuard.validate('cd ..'), /Directory escape detected/);
    assert.throws(() => CommandBoundaryGuard.validate('cd ../..'), /Directory escape detected/);
    assert.throws(() => CommandBoundaryGuard.validate('cd src/..'), /Directory escape detected/);
    assert.throws(() => CommandBoundaryGuard.validate('pushd ..'), /Directory escape detected/);
    
    assert.throws(() => CommandBoundaryGuard.validate('cd /etc'), /Absolute directory traversal detected/);
    assert.throws(() => CommandBoundaryGuard.validate('cd /var/log'), /Absolute directory traversal detected/);
    
    assert.throws(() => CommandBoundaryGuard.validate('cd ~'), /Home directory traversal detected/);
    assert.throws(() => CommandBoundaryGuard.validate('cd ~/foo'), /Home directory traversal detected/);
    
    assert.throws(() => CommandBoundaryGuard.validate('ls && cd ..'), /Directory escape detected/);
    assert.throws(() => CommandBoundaryGuard.validate('cd src; cd ../..'), /Directory escape detected/);
    assert.throws(() => CommandBoundaryGuard.validate('echo hello || cd /'), /Absolute directory traversal detected/);
  });
});

import fs from 'fs';
import path from 'path';
import os from 'os';
import { validatePathBoundary } from './guardrails.js';

test('validatePathBoundary', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-test-'));
  const worktree = path.join(tmpDir, 'worktree');
  fs.mkdirSync(worktree);
  const externalFile = path.join(tmpDir, 'external.txt');
  fs.writeFileSync(externalFile, 'secret');

  await t.test('allows valid paths', () => {
    assert.doesNotThrow(() => validatePathBoundary(worktree, 'src/index.ts'));
    assert.doesNotThrow(() => validatePathBoundary(worktree, './package.json'));
    assert.doesNotThrow(() => validatePathBoundary(worktree, path.join(worktree, 'file.txt')));
  });

  await t.test('blocks directory traversal', () => {
    assert.throws(() => validatePathBoundary(worktree, '../external.txt'), /Path boundary violation/);
    assert.throws(() => validatePathBoundary(worktree, '../../etc/passwd'), /Path boundary violation/);
  });

  await t.test('blocks absolute paths outside worktree', () => {
    assert.throws(() => validatePathBoundary(worktree, '/etc/passwd'), /Path boundary violation/);
    assert.throws(() => validatePathBoundary(worktree, externalFile), /Path boundary violation/);
  });

  await t.test('blocks symlink escapes', () => {
    const symlinkPath = path.join(worktree, 'link-out');
    fs.symlinkSync(tmpDir, symlinkPath);
    // target is inside the symlinked dir, which resolves outside
    assert.throws(() => validatePathBoundary(worktree, 'link-out/external.txt'), /symlink escape/);
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
