import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  detectNodePackageManager,
  buildNodeValidationCommand,
  detectDenoProject,
  detectNodeTestRunner,
  detectGoProject,
  detectJavaProject,
  detectMakefileTestTarget,
  detectDotNetProject,
  detectMonorepoWorkspaces,
  findMatchingWorkspacePackage,
  buildWorkspaceScopedTestCommand,
  capValidationOutput,
  parseTestOutputSummary,
  loadScoutConfigValidationCommand,
  resolveValidationCommand,
  runAdvisoryValidation,
} from './validation.js';

test('Phase 5 Complete Multi-Ecosystem Test Validation Stress & Regression Suite', async (t) => {
  let tmpDir: string;

  t.beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'scout-phase5-validation-'));
  });

  t.afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  await t.test('1. Validates Node.js package manager discovery across pnpm, yarn, bun, and npm', async () => {
    // pnpm
    await fs.promises.writeFile(path.join(tmpDir, 'pnpm-lock.yaml'), '');
    assert.strictEqual(detectNodePackageManager(tmpDir), 'pnpm');
    await fs.promises.unlink(path.join(tmpDir, 'pnpm-lock.yaml'));

    // yarn
    await fs.promises.writeFile(path.join(tmpDir, 'yarn.lock'), '');
    assert.strictEqual(detectNodePackageManager(tmpDir), 'yarn');
    await fs.promises.unlink(path.join(tmpDir, 'yarn.lock'));

    // bun
    await fs.promises.writeFile(path.join(tmpDir, 'bun.lockb'), '');
    assert.strictEqual(detectNodePackageManager(tmpDir), 'bun');
    await fs.promises.unlink(path.join(tmpDir, 'bun.lockb'));

    // npm default
    assert.strictEqual(detectNodePackageManager(tmpDir), 'npm');
  });

  await t.test('2. Validates Deno project detection and priority over standard scripts', async () => {
    await fs.promises.writeFile(path.join(tmpDir, 'deno.json'), '{}');
    await fs.promises.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ scripts: { test: 'npm test' } }),
    );

    assert.strictEqual(detectDenoProject(tmpDir), true);
    assert.strictEqual(resolveValidationCommand(tmpDir), 'deno test');
  });

  await t.test('3. Validates native Node:test and tsx test runners in test/ directory', async () => {
    const testSubDir = path.join(tmpDir, 'tests');
    await fs.promises.mkdir(testSubDir, { recursive: true });

    await fs.promises.writeFile(path.join(testSubDir, 'index.test.ts'), '// test');
    assert.strictEqual(detectNodeTestRunner(tmpDir), 'npx tsx --test');
  });

  await t.test('4. Validates Go, Java/Kotlin, and .NET compiled language runners', async () => {
    // Go module
    await fs.promises.writeFile(path.join(tmpDir, 'go.mod'), 'module test\n\ngo 1.22\n');
    assert.strictEqual(detectGoProject(tmpDir), true);
    assert.strictEqual(resolveValidationCommand(tmpDir), 'go test ./...');
    await fs.promises.unlink(path.join(tmpDir, 'go.mod'));

    // Java Gradle
    await fs.promises.writeFile(path.join(tmpDir, 'gradlew'), '#!/bin/sh\n');
    assert.strictEqual(detectJavaProject(tmpDir), './gradlew test');
    assert.strictEqual(resolveValidationCommand(tmpDir), './gradlew test');
    await fs.promises.unlink(path.join(tmpDir, 'gradlew'));

    // .NET Solution
    await fs.promises.writeFile(path.join(tmpDir, 'Service.sln'), '');
    assert.strictEqual(detectDotNetProject(tmpDir), true);
    assert.strictEqual(resolveValidationCommand(tmpDir), 'dotnet test');
  });

  await t.test('5. Validates Makefile target detection', async () => {
    await fs.promises.writeFile(path.join(tmpDir, 'Makefile'), 'test:\n\t@echo "Running tests"\n');
    assert.strictEqual(detectMakefileTestTarget(tmpDir), 'make test');
    assert.strictEqual(resolveValidationCommand(tmpDir), 'make test');
  });

  await t.test('6. Validates monorepo workspace package isolation and scoped commands', async () => {
    await fs.promises.writeFile(path.join(tmpDir, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n');
    const authPkgDir = path.join(tmpDir, 'packages', 'auth');
    await fs.promises.mkdir(authPkgDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(authPkgDir, 'package.json'),
      JSON.stringify({ name: '@scout/auth', scripts: { test: 'echo auth' } }),
    );

    const ws = detectMonorepoWorkspaces(tmpDir);
    assert.ok(ws !== null);
    assert.strictEqual(ws?.type, 'pnpm');

    const matched = findMatchingWorkspacePackage(path.join(authPkgDir, 'src', 'auth.ts'), ws!);
    assert.ok(matched !== null);
    assert.strictEqual(matched?.name, '@scout/auth');

    const cmd = buildWorkspaceScopedTestCommand(ws!, matched!.name);
    assert.strictEqual(cmd, 'pnpm --filter @scout/auth test');
  });

  await t.test('7. Validates maintainer scout.json override priority', async () => {
    await fs.promises.writeFile(path.join(tmpDir, 'Cargo.toml'), '[package]\nname = "rust_app"\n');
    assert.strictEqual(resolveValidationCommand(tmpDir), 'cargo test');

    // Add scout.json override
    await fs.promises.writeFile(
      path.join(tmpDir, 'scout.json'),
      JSON.stringify({ validation_command: 'cargo check && cargo test --all' }),
    );
    assert.strictEqual(loadScoutConfigValidationCommand(tmpDir), 'cargo check && cargo test --all');
    assert.strictEqual(resolveValidationCommand(tmpDir), 'cargo check && cargo test --all');
  });

  await t.test('8. Validates 64KB output buffer capping and truncation banner', () => {
    const hugeLog = 'OK [1/5000] - Processed item successfully\n'.repeat(3000);
    assert.ok(Buffer.byteLength(hugeLog, 'utf8') > 100 * 1024);

    const capped = capValidationOutput(hugeLog, 64 * 1024);
    assert.ok(Buffer.byteLength(capped, 'utf8') <= 64 * 1024);
    assert.match(capped, /\[TRUNCATED: Output exceeded 64KB limit/);
  });

  await t.test('9. Validates structured test summary extraction across runners', () => {
    const nodeLog = 'ℹ tests 50\nℹ pass 48\nℹ fail 2\nℹ duration_ms 1250\n';
    const summary = parseTestOutputSummary(nodeLog);
    assert.strictEqual(summary.total, 50);
    assert.strictEqual(summary.passed, 48);
    assert.strictEqual(summary.failed, 2);
    assert.strictEqual(summary.duration_ms, 1250);
  });

  await t.test('10. Executes advisory validation successfully on active script', async () => {
    await fs.promises.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        scripts: {
          test: 'echo "Phase 5 end-to-end advisory validation healthy"',
        },
      }),
    );

    const result = await runAdvisoryValidation(tmpDir);
    assert.strictEqual(result.validation_ran, true);
    assert.strictEqual(result.validation_passed, true);
    assert.strictEqual(result.exit_code, 0);
    assert.match(result.stdout, /Phase 5 end-to-end advisory validation healthy/);
  });
});
