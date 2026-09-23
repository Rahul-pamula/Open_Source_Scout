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

  await t.test('skips if package.json does not exist', async () => {
    const result = await runAdvisoryValidation(testDir);
    assert.strictEqual(result.success, true);
    assert.match(result.stdout, /No scout:validate script found/);
  });

  await t.test('skips if scout:validate script is missing', async () => {
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({ scripts: {} }));
    const result = await runAdvisoryValidation(testDir);
    assert.strictEqual(result.success, true);
    assert.match(result.stdout, /No scout:validate script found/);
  });

  await t.test('runs scout:validate and captures success', async () => {
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
      scripts: { 'scout:validate': 'echo "Validation Passed"' }
    }));
    const result = await runAdvisoryValidation(testDir);
    assert.strictEqual(result.success, true);
    assert.match(result.stdout, /Validation Passed/);
  });

  await t.test('runs scout:validate and captures failure', async () => {
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
      scripts: { 'scout:validate': 'echo "Validation Failed" && exit 1' }
    }));
    const result = await runAdvisoryValidation(testDir);
    assert.strictEqual(result.success, false);
    // Error output might be in stdout or stderr depending on how exec captures it. Usually stdout.
    assert.match(result.stdout + result.stderr, /Validation Failed/);
  });
});
