import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  runAdvisoryValidation,
  detectNodePackageManager,
  buildNodeValidationCommand,
  detectDenoProject,
  detectNodeTestRunner,
  resolveValidationCommand,
} from './validation.js';

test('Validation Runner & Package Manager Detection', async (t) => {
  const testDir = path.join(process.cwd(), '.test-scout-validation');

  t.beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  t.afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  await t.test('detects package managers by lockfile presence', () => {
    assert.strictEqual(detectNodePackageManager(testDir), 'npm');

    fs.writeFileSync(path.join(testDir, 'yarn.lock'), '');
    assert.strictEqual(detectNodePackageManager(testDir), 'yarn');
    fs.rmSync(path.join(testDir, 'yarn.lock'));

    fs.writeFileSync(path.join(testDir, 'pnpm-lock.yaml'), '');
    assert.strictEqual(detectNodePackageManager(testDir), 'pnpm');
    fs.rmSync(path.join(testDir, 'pnpm-lock.yaml'));

    fs.writeFileSync(path.join(testDir, 'bun.lockb'), '');
    assert.strictEqual(detectNodePackageManager(testDir), 'bun');
    fs.rmSync(path.join(testDir, 'bun.lockb'));

    fs.writeFileSync(path.join(testDir, 'bun.lock'), '');
    assert.strictEqual(detectNodePackageManager(testDir), 'bun');
    fs.rmSync(path.join(testDir, 'bun.lock'));
  });

  await t.test('detects Deno projects and resolves deno test command', () => {
    assert.strictEqual(detectDenoProject(testDir), false);

    fs.writeFileSync(path.join(testDir, 'deno.json'), '{}');
    assert.strictEqual(detectDenoProject(testDir), true);
    assert.strictEqual(resolveValidationCommand(testDir), 'deno test');
    fs.rmSync(path.join(testDir, 'deno.json'));

    fs.writeFileSync(path.join(testDir, 'deno.jsonc'), '{}');
    assert.strictEqual(detectDenoProject(testDir), true);
    assert.strictEqual(resolveValidationCommand(testDir), 'deno test');
    fs.rmSync(path.join(testDir, 'deno.jsonc'));
  });

  await t.test('detects native node:test and tsx test runners', () => {
    assert.strictEqual(detectNodeTestRunner(testDir), null);

    const testSubDir = path.join(testDir, 'test');
    fs.mkdirSync(testSubDir, { recursive: true });

    // JS test file
    fs.writeFileSync(path.join(testSubDir, 'sample.test.js'), '// test');
    assert.strictEqual(detectNodeTestRunner(testDir), 'node --test');

    // TS test file takes precedence for tsx runner
    fs.writeFileSync(path.join(testSubDir, 'sample.test.ts'), '// test');
    assert.strictEqual(detectNodeTestRunner(testDir), 'npx tsx --test');

    fs.rmSync(testSubDir, { recursive: true, force: true });
  });

  await t.test('builds appropriate validation commands for each package manager', () => {
    // scout:validate
    assert.strictEqual(buildNodeValidationCommand('pnpm', { 'scout:validate': 'echo ok' }), 'pnpm run scout:validate');
    assert.strictEqual(buildNodeValidationCommand('yarn', { 'scout:validate': 'echo ok' }), 'yarn scout:validate');
    assert.strictEqual(buildNodeValidationCommand('bun', { 'scout:validate': 'echo ok' }), 'bun run scout:validate');
    assert.strictEqual(buildNodeValidationCommand('npm', { 'scout:validate': 'echo ok' }), 'npm run scout:validate');

    // test
    assert.strictEqual(buildNodeValidationCommand('pnpm', { test: 'echo ok' }), 'pnpm test');
    assert.strictEqual(buildNodeValidationCommand('yarn', { test: 'echo ok' }), 'yarn test');
    assert.strictEqual(buildNodeValidationCommand('bun', { test: 'echo ok' }), 'bun test');
    assert.strictEqual(buildNodeValidationCommand('npm', { test: 'echo ok' }), 'npm test');

    // neither
    assert.strictEqual(buildNodeValidationCommand('npm', { build: 'echo ok' }), null);
  });

  await t.test('skips if no recognized config exists', async () => {
    const result = await runAdvisoryValidation(testDir);
    assert.strictEqual(result.validation_passed, true);
    assert.match(result.stdout, /No standard validation command detected/);
  });

  await t.test('skips if package.json has no test or validate script and no test files', async () => {
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({ scripts: {} }));
    const result = await runAdvisoryValidation(testDir);
    assert.strictEqual(result.validation_passed, true);
    assert.match(result.stdout, /No standard validation command detected/);
  });

  await t.test('runs scout:validate and captures success', async () => {
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify({
        scripts: { 'scout:validate': 'echo "Validation Passed"' },
      }),
    );
    const result = await runAdvisoryValidation(testDir);
    assert.strictEqual(result.validation_passed, true);
    assert.match(result.stdout, /Validation Passed/);
  });

  await t.test('runs npm test if test script exists and scout:validate is missing', async () => {
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify({
        scripts: { test: 'echo "NPM Test Passed"' },
      }),
    );
    const result = await runAdvisoryValidation(testDir);
    assert.strictEqual(result.validation_passed, true);
    assert.match(result.stdout, /NPM Test Passed/);
  });

  await t.test('runs pytest if pytest.ini exists', async () => {
    fs.writeFileSync(path.join(testDir, 'pytest.ini'), '[pytest]');
    const result = await runAdvisoryValidation(testDir);
    assert.strictEqual(result.validation_ran, true);
  });

  await t.test('runs pytest if requirements.txt contains pytest', async () => {
    fs.writeFileSync(path.join(testDir, 'requirements.txt'), 'pytest==6.0.0\nother-lib==1.0.0');
    const result = await runAdvisoryValidation(testDir);
    assert.strictEqual(result.validation_ran, true);
  });

  await t.test('runs cargo test if Cargo.toml exists', async () => {
    fs.writeFileSync(path.join(testDir, 'Cargo.toml'), '[package]');
    const result = await runAdvisoryValidation(testDir);
    assert.strictEqual(result.validation_ran, true);
  });

  await t.test('runs scout:validate and captures failure', async () => {
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify({
        scripts: { 'scout:validate': 'echo "Validation Failed" && exit 1' },
      }),
    );
    const result = await runAdvisoryValidation(testDir);
    assert.strictEqual(result.validation_passed, false);
    assert.match(result.stdout + result.stderr, /Validation Failed/);
  });
});
