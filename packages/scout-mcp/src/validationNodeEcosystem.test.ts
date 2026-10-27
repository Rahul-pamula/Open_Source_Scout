import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  detectNodePackageManager,
  buildNodeValidationCommand,
  detectDenoProject,
  resolveValidationCommand,
  runAdvisoryValidation,
} from './validation.js';

test('Node Ecosystem & Modern JS/TS Runner Detection Suite', async (t) => {
  let tmpDir: string;

  t.beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'scout-node-ecosystem-'));
  });

  t.afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  await t.test('1. Accurately selects pnpm commands when pnpm-lock.yaml is present', async () => {
    await fs.promises.writeFile(path.join(tmpDir, 'pnpm-lock.yaml'), 'lockfileVersion: 5.4');
    assert.strictEqual(detectNodePackageManager(tmpDir), 'pnpm');

    // With scout:validate script
    await fs.promises.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        scripts: {
          'scout:validate': 'echo "pnpm validate passed"',
          test: 'echo "pnpm test passed"',
        },
      }),
    );
    assert.strictEqual(resolveValidationCommand(tmpDir), 'pnpm run scout:validate');

    // With only test script
    await fs.promises.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        scripts: {
          test: 'echo "pnpm test passed"',
        },
      }),
    );
    assert.strictEqual(resolveValidationCommand(tmpDir), 'pnpm test');
  });

  await t.test('2. Accurately selects yarn commands when yarn.lock is present', async () => {
    await fs.promises.writeFile(path.join(tmpDir, 'yarn.lock'), '# yarn lockfile v1');
    assert.strictEqual(detectNodePackageManager(tmpDir), 'yarn');

    await fs.promises.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        scripts: {
          'scout:validate': 'echo "yarn validate passed"',
        },
      }),
    );
    assert.strictEqual(resolveValidationCommand(tmpDir), 'yarn scout:validate');

    await fs.promises.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        scripts: {
          test: 'echo "yarn test passed"',
        },
      }),
    );
    assert.strictEqual(resolveValidationCommand(tmpDir), 'yarn test');
  });

  await t.test('3. Accurately selects bun commands for bun.lockb and bun.lock', async () => {
    // Binary bun.lockb
    await fs.promises.writeFile(path.join(tmpDir, 'bun.lockb'), Buffer.from([0x00, 0x62, 0x75, 0x6e]));
    assert.strictEqual(detectNodePackageManager(tmpDir), 'bun');

    await fs.promises.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        scripts: {
          'scout:validate': 'echo "bun validate passed"',
        },
      }),
    );
    assert.strictEqual(resolveValidationCommand(tmpDir), 'bun run scout:validate');

    await fs.promises.unlink(path.join(tmpDir, 'bun.lockb'));

    // Text bun.lock (Bun v1.2+)
    await fs.promises.writeFile(path.join(tmpDir, 'bun.lock'), '# bun lockfile');
    assert.strictEqual(detectNodePackageManager(tmpDir), 'bun');

    await fs.promises.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        scripts: {
          test: 'echo "bun test passed"',
        },
      }),
    );
    assert.strictEqual(resolveValidationCommand(tmpDir), 'bun test');
  });

  await t.test('4. Accurately detects Deno runtime configuration files', async () => {
    assert.strictEqual(detectDenoProject(tmpDir), false);

    // deno.json
    await fs.promises.writeFile(path.join(tmpDir, 'deno.json'), JSON.stringify({ tasks: { test: 'deno test' } }));
    assert.strictEqual(detectDenoProject(tmpDir), true);
    assert.strictEqual(resolveValidationCommand(tmpDir), 'deno test');

    await fs.promises.unlink(path.join(tmpDir, 'deno.json'));

    // deno.jsonc
    await fs.promises.writeFile(path.join(tmpDir, 'deno.jsonc'), '{\n  // Deno config\n}\n');
    assert.strictEqual(detectDenoProject(tmpDir), true);
    assert.strictEqual(resolveValidationCommand(tmpDir), 'deno test');
  });

  await t.test('5. Prioritizes Deno over package.json when deno.json is configured', async () => {
    await fs.promises.writeFile(path.join(tmpDir, 'deno.json'), '{}');
    await fs.promises.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        scripts: { test: 'npm test' },
      }),
    );

    // Deno projects take precedence over standard Node scripts
    assert.strictEqual(resolveValidationCommand(tmpDir), 'deno test');
  });

  await t.test('6. Executes advisory validation successfully with custom scripts', async () => {
    await fs.promises.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        scripts: {
          test: 'echo "Validation runner active and healthy"',
        },
      }),
    );

    const result = await runAdvisoryValidation(tmpDir);
    assert.strictEqual(result.validation_ran, true);
    assert.strictEqual(result.validation_passed, true);
    assert.match(result.stdout, /Validation runner active and healthy/);
  });
});
