import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { runAdvisoryValidation } from './validation.js';

test('Validation Runner', async (t) => {
  const testDir = path.join(process.cwd(), '.test-scout-validation');

  t.beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  t.afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  await t.test('skips if no recognized config exists', async () => {
    const result = await runAdvisoryValidation(testDir);
    assert.strictEqual(result.validation_passed, true);
    assert.match(result.stdout, /No standard validation command detected/);
  });

  await t.test('skips if package.json has no test or validate script', async () => {
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({ scripts: {} }));
    const result = await runAdvisoryValidation(testDir);
    assert.strictEqual(result.validation_passed, true);
    assert.match(result.stdout, /No standard validation command detected/);
  });

  await t.test('runs scout:validate and captures success', async () => {
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
      scripts: { 'scout:validate': 'echo "Validation Passed"' }
    }));
    const result = await runAdvisoryValidation(testDir);
    assert.strictEqual(result.validation_passed, true);
    assert.match(result.stdout, /Validation Passed/);
  });
  
  await t.test('runs npm test if test script exists and scout:validate is missing', async () => {
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
      scripts: { 'test': 'echo "NPM Test Passed"' }
    }));
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
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
      scripts: { 'scout:validate': 'echo "Validation Failed" && exit 1' }
    }));
    const result = await runAdvisoryValidation(testDir);
    assert.strictEqual(result.validation_passed, false);
    assert.match(result.stdout + result.stderr, /Validation Failed/);
  });
});
