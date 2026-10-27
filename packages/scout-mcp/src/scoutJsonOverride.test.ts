import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  loadScoutConfigValidationCommand,
  resolveValidationCommand,
  runAdvisoryValidation,
} from './validation.js';

test('Scout Configuration Custom Validation Override Suite', async (t) => {
  let tmpDir: string;

  t.beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'scout-json-override-'));
  });

  t.afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  await t.test('1. Runs custom validation_command defined in scout.json over auto-detected commands', async () => {
    // Provide competing package.json
    await fs.promises.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ scripts: { test: 'npm test' } }),
    );
    assert.strictEqual(resolveValidationCommand(tmpDir), 'npm test');

    // Create scout.json override
    await fs.promises.writeFile(
      path.join(tmpDir, 'scout.json'),
      JSON.stringify({ validation_command: './bin/custom-test-runner.sh --all' }),
    );
    assert.strictEqual(loadScoutConfigValidationCommand(tmpDir), './bin/custom-test-runner.sh --all');
    assert.strictEqual(resolveValidationCommand(tmpDir), './bin/custom-test-runner.sh --all');
  });

  await t.test('2. Resolves validation_command from .scout.json', async () => {
    await fs.promises.writeFile(
      path.join(tmpDir, '.scout.json'),
      JSON.stringify({ validation_command: 'make fast-test' }),
    );
    assert.strictEqual(loadScoutConfigValidationCommand(tmpDir), 'make fast-test');
    assert.strictEqual(resolveValidationCommand(tmpDir), 'make fast-test');
  });

  await t.test('3. Resolves validation_command from .scout/config.json', async () => {
    const scoutSubDir = path.join(tmpDir, '.scout');
    await fs.promises.mkdir(scoutSubDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(scoutSubDir, 'config.json'),
      JSON.stringify({ validation_command: 'tox -e py311' }),
    );
    assert.strictEqual(loadScoutConfigValidationCommand(tmpDir), 'tox -e py311');
    assert.strictEqual(resolveValidationCommand(tmpDir), 'tox -e py311');
  });

  await t.test('4. Gracefully falls back when scout.json has malformed JSON or empty string', async () => {
    // Malformed JSON
    await fs.promises.writeFile(path.join(tmpDir, 'scout.json'), '{ "validation_command": invalid json ...');
    assert.strictEqual(loadScoutConfigValidationCommand(tmpDir), null);

    // Empty validation_command string
    await fs.promises.writeFile(path.join(tmpDir, 'scout.json'), JSON.stringify({ validation_command: '   ' }));
    assert.strictEqual(loadScoutConfigValidationCommand(tmpDir), null);

    // Non-string validation_command
    await fs.promises.writeFile(path.join(tmpDir, 'scout.json'), JSON.stringify({ validation_command: 12345 }));
    assert.strictEqual(loadScoutConfigValidationCommand(tmpDir), null);
  });

  await t.test('5. Executes custom validation command and captures results in runAdvisoryValidation', async () => {
    await fs.promises.writeFile(
      path.join(tmpDir, 'scout.json'),
      JSON.stringify({ validation_command: 'echo "Custom pipeline executed successfully"' }),
    );

    const result = await runAdvisoryValidation(tmpDir);
    assert.strictEqual(result.validation_ran, true);
    assert.strictEqual(result.validation_passed, true);
    assert.match(result.stdout, /Custom pipeline executed successfully/);
  });
});
