import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  CommandBoundaryGuard,
  validatePathBoundary,
  getGuardrailLevel,
  handleGuardrailViolation,
  GuardrailError,
} from './guardrails.js';

test('Guardrail Audit Mode and Telemetry Test Suite', async (t) => {
  let tmpDir: string;
  let worktree: string;
  const originalEnvLevel = process.env.SCOUT_GUARDRAIL_LEVEL;

  t.beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-audit-test-'));
    worktree = path.join(tmpDir, 'audit-worktree');
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

  await t.test('verifies audit level logs warnings accurately to console without throwing', () => {
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
      warnings.push(args.join(' '));
    };

    try {
      process.env.SCOUT_GUARDRAIL_LEVEL = 'audit';
      assert.strictEqual(getGuardrailLevel(), 'audit');

      // 1. Audit boundary violation
      const resolved = validatePathBoundary(worktree, '/etc/shadow');
      assert.ok(resolved.endsWith('/etc/shadow'));
      assert.strictEqual(warnings.length, 1);
      assert.match(warnings[0], /\[Guardrail Audit Warning\]/);
      assert.match(warnings[0], /Access to system path/);

      // 2. Audit destructive command
      CommandBoundaryGuard.validate('rm -rf /');
      assert.strictEqual(warnings.length, 2);
      assert.match(warnings[1], /\[Guardrail Audit Warning\]/);
      assert.match(warnings[1], /Destructive root\/system recursive deletion/);

      // 3. Direct handler invocation
      handleGuardrailViolation('Direct test alert', 'audit');
      assert.strictEqual(warnings.length, 3);
      assert.match(warnings[2], /Direct test alert/);
    } finally {
      console.warn = originalWarn;
    }
  });

  await t.test('verifies strict mode strictly enforces exceptions and blocks operations', () => {
    process.env.SCOUT_GUARDRAIL_LEVEL = 'strict';
    assert.strictEqual(getGuardrailLevel(), 'strict');

    assert.throws(
      () => validatePathBoundary(worktree, '../../outside.txt'),
      (err: any) => {
        assert.strictEqual(err.name, 'GuardrailError');
        return true;
      },
    );

    assert.throws(
      () => CommandBoundaryGuard.validate('rm -rf /'),
      (err: any) => {
        assert.strictEqual(err.name, 'GuardrailError');
        return true;
      },
    );
  });

  await t.test('verifies standard mode strictly enforces exceptions on security violations', () => {
    process.env.SCOUT_GUARDRAIL_LEVEL = 'standard';
    assert.strictEqual(getGuardrailLevel(), 'standard');

    assert.throws(
      () => CommandBoundaryGuard.validate(':(){ :|:& };:'),
      (err: any) => {
        assert.strictEqual(err.name, 'GuardrailError');
        return true;
      },
    );
  });
});
