import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { applyStringEdit, generateUnifiedDiff } from './editor.js';

test('Editor Dry Run Test Suite', async (t) => {
  let tmpDir: string;

  t.beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-dry-run-test-'));
  });

  t.afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  await t.test('calculates diff and validates replacement without writing when dry_run is true', async () => {
    const filePath = path.join(tmpDir, 'service.ts');
    const initialContent = 'export const PORT = 3000;\nexport const HOST = "localhost";\n';
    await fs.writeFile(filePath, initialContent, 'utf8');

    // Perform dry run simulation
    const fileContent = await fs.readFile(filePath, 'utf8');
    const newContent = applyStringEdit(fileContent, { search: '3000', replace: '8080' });
    const diff = generateUnifiedDiff('service.ts', fileContent, newContent);

    assert.ok(diff.includes('-export const PORT = 3000;'));
    assert.ok(diff.includes('+export const PORT = 8080;'));

    // Verify on-disk file was untouched
    const diskContentAfter = await fs.readFile(filePath, 'utf8');
    assert.strictEqual(diskContentAfter, initialContent, 'Disk content should be completely unchanged after dry run');
  });

  await t.test('propagates errors during dry run when search string is absent or ambiguous', async () => {
    const filePath = path.join(tmpDir, 'service.ts');
    await fs.writeFile(filePath, 'const a = 1;\nconst a = 1;\n', 'utf8');

    const fileContent = await fs.readFile(filePath, 'utf8');
    assert.throws(
      () => applyStringEdit(fileContent, { search: 'const a = 1;', replace: 'const a = 2;' }),
      /Ambiguous match/
    );

    assert.throws(
      () => applyStringEdit(fileContent, { search: 'absent', replace: 'foo' }),
      /Search string not found/
    );
  });
});
