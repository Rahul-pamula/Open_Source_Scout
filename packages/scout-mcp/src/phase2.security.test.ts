import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  CommandBoundaryGuard,
  validatePathBoundary,
  sanitizeEnvironment,
  getGuardrailLevel,
  GuardrailError,
} from './guardrails.js';
import { formatJsonRpcError, McpErrorCode } from './index.js';

test('Phase 2 Complete Security Regression Suite', async (t) => {
  let tmpDir: string;
  let worktree: string;
  const originalEnvLevel = process.env.SCOUT_GUARDRAIL_LEVEL;

  t.beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-phase2-security-'));
    worktree = path.join(tmpDir, 'secure-worktree');
    await fs.mkdir(worktree, { recursive: true });
    delete process.env.SCOUT_GUARDRAIL_LEVEL;
  });

  t.afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    if (originalEnvLevel !== undefined) {
      process.env.SCOUT_GUARDRAIL_LEVEL = originalEnvLevel;
    } else {
      delete process.env.SCOUT_GUARDRAIL_LEVEL;
    }
  });

  await t.test('1. System command guardrails block destructive payloads', () => {
    const destructive = [
      'rm -rf /',
      'rm -rf /*',
      'rm -fr /',
      'rm -rf ~',
      'rm -rf $HOME',
      ':(){ :|:& };:',
      'mkfs /dev/sda1',
      'mkfs.ext4 /dev/nvme0n1',
      'dd if=/dev/zero of=/dev/sda',
      'dd if=/dev/urandom of=/dev/sdb bs=1M',
    ];

    for (const cmd of destructive) {
      assert.throws(
        () => CommandBoundaryGuard.validate(cmd),
        (err: any) => err instanceof GuardrailError,
        `Expected rejection for destructive command: ${cmd}`,
      );
    }
  });

  await t.test('2. Subshell expansion and execution escapes are recursively blocked', () => {
    const subshellPayloads = [
      'echo $(cd .. && pwd)',
      'touch `cd /etc && ls`',
      'TEST=$(rm -rf /)',
      'VAR=`mkfs /dev/sda`',
      'OUTPUT=$(pushd .. && ls)',
    ];

    for (const cmd of subshellPayloads) {
      assert.throws(
        () => CommandBoundaryGuard.validate(cmd),
        (err: any) => err instanceof GuardrailError,
        `Expected rejection for subshell pattern: ${cmd}`,
      );
    }
  });

  await t.test('3. Command-level working directory confinement blocks external escapes', () => {
    const traversalCommands = [
      'cd ..',
      'cd ../..',
      'cd /etc',
      'cd /tmp',
      'cd ~',
      'cd $HOME',
      'pushd ..',
      'pushd /var',
    ];

    for (const cmd of traversalCommands) {
      assert.throws(
        () => CommandBoundaryGuard.validate(cmd),
        (err: any) => err instanceof GuardrailError,
        `Expected rejection for traversal command: ${cmd}`,
      );
    }
  });

  await t.test('4. Process environment sanitization strips injection vectors and credentials', () => {
    const dirtyEnv = {
      PATH: '/usr/bin:/bin',
      HOME: '/Users/test',
      LD_PRELOAD: '/tmp/malicious.so',
      DYLD_INSERT_LIBRARIES: '/tmp/evil.dylib',
      NODE_OPTIONS: '--inspect=0.0.0.0',
      PYTHONPATH: '/tmp/hijack',
      AWS_SECRET_ACCESS_KEY: 'supersecret',
      GITHUB_TOKEN: 'ghp_secrettoken',
      SCOUT_TEST_VAR: 'allowed_clean_var',
    };

    const sanitized = sanitizeEnvironment(dirtyEnv);

    assert.strictEqual(sanitized.PATH, '/usr/bin:/bin');
    assert.strictEqual(sanitized.HOME, '/Users/test');
    assert.strictEqual(sanitized.SCOUT_TEST_VAR, 'allowed_clean_var');

    // Forbidden vectors must be absent
    assert.strictEqual(sanitized.LD_PRELOAD, undefined);
    assert.strictEqual(sanitized.DYLD_INSERT_LIBRARIES, undefined);
    assert.strictEqual(sanitized.NODE_OPTIONS, undefined);
    assert.strictEqual(sanitized.PYTHONPATH, undefined);
    assert.strictEqual(sanitized.AWS_SECRET_ACCESS_KEY, undefined);
    assert.strictEqual(sanitized.GITHUB_TOKEN, undefined);
  });

  await t.test('5. Filesystem boundary blocks root system directories and Windows drives', () => {
    const forbiddenPaths = [
      '/etc/shadow',
      '/proc/self/mem',
      '/sys/kernel',
      '/dev/null',
      '/var/run/docker.sock',
      'C:/Windows/System32',
      'D:\\Secrets\\passwords.txt',
    ];

    for (const p of forbiddenPaths) {
      assert.throws(
        () => validatePathBoundary(worktree, p),
        (err: any) => err instanceof GuardrailError,
        `Expected rejection for system path: ${p}`,
      );
    }
  });

  await t.test('6. Git internal directory and git hooks are strictly protected', () => {
    const gitPaths = [
      '.git/hooks/pre-commit',
      '.git/config',
      '.git/HEAD',
      'submodule/.git/index',
      './.git/hooks/post-checkout',
    ];

    for (const p of gitPaths) {
      assert.throws(
        () => validatePathBoundary(worktree, p),
        (err: any) => err instanceof GuardrailError,
        `Expected rejection for Git internal path: ${p}`,
      );
    }
  });

  await t.test('7. Sensitive credential directories and secrets files are blocked', () => {
    const secretPaths = [
      '.ssh/id_rsa',
      '.aws/credentials',
      '.azure/tokens',
      '.kube/config',
      '.env',
      '.env.production',
      '.env.local',
      'server/id_ed25519',
      'certs/server.pem',
      'keys/tls.key',
    ];

    for (const p of secretPaths) {
      assert.throws(
        () => validatePathBoundary(worktree, p),
        (err: any) => err instanceof GuardrailError,
        `Expected rejection for secret path: ${p}`,
      );
    }

    // Permitted benign config files
    const safeFiles = ['.env.example', '.env.sample', '.env.template', 'config.json'];
    for (const sf of safeFiles) {
      const resolved = validatePathBoundary(worktree, sf);
      assert.strictEqual(resolved, path.resolve(worktree, sf));
    }
  });

  await t.test('8. Symlink directory escapes outside worktree are blocked', async () => {
    const outsideTarget = path.join(tmpDir, 'outside-secret.txt');
    await fs.writeFile(outsideTarget, 'classified');

    const symlinkPath = path.join(worktree, 'symlink-to-outside');
    await fs.symlink(outsideTarget, symlinkPath);

    assert.throws(
      () => validatePathBoundary(worktree, 'symlink-to-outside'),
      (err: any) => err instanceof GuardrailError,
      'Expected symlink escape to be rejected',
    );
  });

  await t.test('9. JSON-RPC error formatting returns GuardrailViolation code -32003', () => {
    try {
      validatePathBoundary(worktree, '/etc/passwd');
      assert.fail('Should have thrown GuardrailError');
    } catch (err: any) {
      const formatted = formatJsonRpcError(err);
      assert.strictEqual(formatted.isError, true);
      const parsed = JSON.parse(formatted.content[0].text);
      assert.strictEqual(parsed.error.code, McpErrorCode.GuardrailViolation);
      assert.match(parsed.error.message, /Path boundary violation|strictly forbidden/);
    }
  });

  await t.test('10. Configurable guardrail level modes behave as specified', () => {
    // Audit mode logs warnings without throwing
    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (...args: any[]) => warnings.push(args.join(' '));

    try {
      process.env.SCOUT_GUARDRAIL_LEVEL = 'audit';
      assert.strictEqual(getGuardrailLevel(), 'audit');

      const resolved = validatePathBoundary(worktree, '/etc/hosts');
      assert.ok(resolved.endsWith('/etc/hosts'));
      assert.ok(warnings.length > 0);
      assert.match(warnings[0], /\[Guardrail Audit Warning\]/);

      CommandBoundaryGuard.validate('rm -rf /');
      assert.ok(warnings.length > 1);
    } finally {
      console.warn = origWarn;
    }
  });
});
