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

  await t.test('destructive commands blocked', () => {
    assert.throws(() => CommandBoundaryGuard.validate('rm -rf /'), /Destructive root\/system recursive deletion detected/);
    assert.throws(() => CommandBoundaryGuard.validate('rm -rf /*'), /Destructive root\/system recursive deletion detected/);
    assert.throws(() => CommandBoundaryGuard.validate('rm -fr ~'), /Destructive root\/system recursive deletion detected/);
    assert.throws(() => CommandBoundaryGuard.validate('mkfs /dev/sda1'), /Filesystem formatting command detected/);
    assert.throws(() => CommandBoundaryGuard.validate('mkfs.ext4 /dev/nvme0n1'), /Filesystem formatting command detected/);
    assert.throws(() => CommandBoundaryGuard.validate('dd if=/dev/zero of=/dev/sda'), /Raw block device overwrite detected/);
    assert.throws(() => CommandBoundaryGuard.validate(':(){ :|:& };:'), /Fork bomb pattern detected/);
  });

  await t.test('subshell escape patterns blocked ($(), backticks)', () => {
    assert.throws(() => CommandBoundaryGuard.validate('echo $(cd .. && pwd)'), /Directory escape detected/);
    assert.throws(() => CommandBoundaryGuard.validate('echo `cd ../.. && ls`'), /Directory escape detected/);
    assert.throws(() => CommandBoundaryGuard.validate('VAR=$(cd /etc && ls)'), /Absolute directory traversal detected/);
    assert.throws(() => CommandBoundaryGuard.validate('RESULT=`rm -rf /`'), /Destructive root\/system recursive deletion detected/);

    // Benign subshells allowed
    assert.doesNotThrow(() => CommandBoundaryGuard.validate('echo $(date)'));
    assert.doesNotThrow(() => CommandBoundaryGuard.validate('echo `git rev-parse HEAD`'));
    assert.doesNotThrow(() => CommandBoundaryGuard.validate('echo $(cd src && ls)'));
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

  await t.test('blocks access to .git metadata and hooks while permitting .gitignore', () => {
    assert.throws(() => validatePathBoundary(worktree, '.git'), /\.git directory or Git internals is strictly forbidden/);
    assert.throws(() => validatePathBoundary(worktree, '.git/hooks/pre-commit'), /\.git directory or Git internals is strictly forbidden/);
    assert.throws(() => validatePathBoundary(worktree, '.git/config'), /\.git directory or Git internals is strictly forbidden/);
    assert.throws(() => validatePathBoundary(worktree, 'subdir/.git/HEAD'), /\.git directory or Git internals is strictly forbidden/);
    
    // Legitimate project files starting with .git must remain accessible
    assert.doesNotThrow(() => validatePathBoundary(worktree, '.gitignore'));
    assert.doesNotThrow(() => validatePathBoundary(worktree, '.gitattributes'));
    assert.doesNotThrow(() => validatePathBoundary(worktree, '.github/workflows/test.yml'));
  });

  await t.test('blocks sensitive credentials while permitting examples', () => {
    // Secret env files
    assert.throws(() => validatePathBoundary(worktree, '.env'), /Access to sensitive environment file/);
    assert.throws(() => validatePathBoundary(worktree, '.env.local'), /Access to sensitive environment file/);
    assert.throws(() => validatePathBoundary(worktree, '.env.production'), /Access to sensitive environment file/);

    // Permitted templates
    assert.doesNotThrow(() => validatePathBoundary(worktree, '.env.example'));
    assert.doesNotThrow(() => validatePathBoundary(worktree, '.env.sample'));
    assert.doesNotThrow(() => validatePathBoundary(worktree, '.env.template'));

    // SSH and private keys
    assert.throws(() => validatePathBoundary(worktree, 'id_rsa'), /Access to sensitive key or credential file/);
    assert.throws(() => validatePathBoundary(worktree, 'id_ed25519'), /Access to sensitive key or credential file/);
    assert.throws(() => validatePathBoundary(worktree, 'server.key'), /Access to sensitive key or credential file/);
    assert.throws(() => validatePathBoundary(worktree, 'cert.pem'), /Access to sensitive key or credential file/);

    // Cloud credential directories
    assert.throws(() => validatePathBoundary(worktree, '.aws/credentials'), /Access to sensitive credential directory/);
    assert.throws(() => validatePathBoundary(worktree, '.ssh/authorized_keys'), /Access to sensitive credential directory/);
  });

  await t.test('normalizes cross-platform Windows and Unix path separators', () => {
    // Windows backslash traversal blocked
    assert.throws(() => validatePathBoundary(worktree, '..\\..\\secret'), /Path boundary violation/);
    assert.throws(() => validatePathBoundary(worktree, 'sub\\..\\..\\external'), /Path boundary violation/);

    // Windows drive letters blocked
    assert.throws(() => validatePathBoundary(worktree, 'C:\\Windows\\System32'), /Windows absolute drive traversal detected/);
    assert.throws(() => validatePathBoundary(worktree, 'D:/secrets'), /Windows absolute drive traversal detected/);

    // CommandBoundaryGuard Windows paths
    assert.throws(() => CommandBoundaryGuard.validate('cd ..\\..'), /Directory escape detected/);
    assert.throws(() => CommandBoundaryGuard.validate('cd C:\\tools'), /Absolute directory traversal detected/);

    // Valid Windows relative paths permitted
    assert.doesNotThrow(() => validatePathBoundary(worktree, 'src\\index.ts'));
    assert.doesNotThrow(() => validatePathBoundary(worktree, '.\\package.json'));
  });

  await t.test('blocks read_file attempts against hidden system paths', () => {
    assert.throws(() => validatePathBoundary(worktree, '/etc/hosts'), /Access to system path/);
    assert.throws(() => validatePathBoundary(worktree, '/proc/cpuinfo'), /Access to system path/);
    assert.throws(() => validatePathBoundary(worktree, '/sys/kernel'), /Access to system path/);
    assert.throws(() => validatePathBoundary(worktree, '/dev/urandom'), /Access to system path/);
  });

  await t.test('supports configurable guardrail override levels (strict, standard, audit)', async () => {
    const { getGuardrailLevel } = await import('./guardrails.js');
    
    // Default level is strict
    delete process.env.SCOUT_GUARDRAIL_LEVEL;
    assert.strictEqual(getGuardrailLevel(), 'strict');

    process.env.SCOUT_GUARDRAIL_LEVEL = 'audit';
    assert.strictEqual(getGuardrailLevel(), 'audit');

    // Audit mode logs warning without throwing GuardrailError
    assert.doesNotThrow(() => CommandBoundaryGuard.validate('cd /etc', 'audit'));
    assert.doesNotThrow(() => validatePathBoundary(worktree, '/etc/hosts', 'audit'));

    // Strict mode throws
    assert.throws(() => CommandBoundaryGuard.validate('cd /etc', 'strict'), /Absolute directory traversal detected/);
    assert.throws(() => validatePathBoundary(worktree, '/etc/hosts', 'strict'), /Access to system path/);

    delete process.env.SCOUT_GUARDRAIL_LEVEL;
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
