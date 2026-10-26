import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { validatePathBoundary, GuardrailError } from './guardrails.js';

test('Sensitive Secrets & Credentials Guardrail Test Suite', async (t) => {
  let tmpDir: string;
  let worktree: string;

  t.beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-secretguard-test-'));
    worktree = path.join(tmpDir, 'repo-worktree');
    await fs.mkdir(worktree, { recursive: true });
    await fs.mkdir(path.join(worktree, '.aws'), { recursive: true });
    await fs.mkdir(path.join(worktree, '.ssh'), { recursive: true });
  });

  t.afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  await t.test('strictly blocks reading secret environment variable files', () => {
    const sensitiveEnvFiles = [
      '.env',
      '.env.local',
      '.env.development',
      '.env.staging',
      '.env.production',
      '.env.test.local',
      'submodule/.env',
      'apps/api/.env.production',
    ];

    for (const envFile of sensitiveEnvFiles) {
      assert.throws(
        () => validatePathBoundary(worktree, envFile),
        (err: any) => {
          assert.strictEqual(err.name, 'GuardrailError');
          assert.match(err.message, /Access to sensitive environment file/);
          return true;
        },
        `Expected read access to "${envFile}" to be strictly rejected.`,
      );
    }
  });

  await t.test('strictly blocks reading private keys, certificates, and auth credentials', () => {
    const secretKeyFiles = [
      'id_rsa',
      'id_rsa.pub',
      'id_ed25519',
      'id_ed25519.pub',
      'id_ecdsa',
      'id_dsa',
      'server.key',
      'private_key.pem',
      'auth.pfx',
      'identity.p12',
      '.aws/credentials',
      '.aws/config',
      '.ssh/id_rsa',
      '.ssh/known_hosts',
    ];

    for (const keyFile of secretKeyFiles) {
      assert.throws(
        () => validatePathBoundary(worktree, keyFile),
        (err: any) => {
          assert.strictEqual(err.name, 'GuardrailError');
          assert.match(err.message, /Path boundary violation/);
          return true;
        },
        `Expected access to secret file "${keyFile}" to be strictly rejected.`,
      );
    }
  });

  await t.test('safely permits reading non-sensitive template and example configuration files', () => {
    const allowedExampleFiles = [
      '.env.example',
      '.env.sample',
      '.env.template',
      'apps/web/.env.example',
      'config/env.template',
      'README.md',
      'src/config/keys.example.ts',
    ];

    for (const allowedFile of allowedExampleFiles) {
      assert.doesNotThrow(
        () => validatePathBoundary(worktree, allowedFile),
        `Template file "${allowedFile}" should remain readable for developer onboarding.`,
      );
    }
  });
});
