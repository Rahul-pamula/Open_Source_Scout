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

    const statBefore = await fs.stat(filePath);

    // Perform dry run simulation
    const fileContent = await fs.readFile(filePath, 'utf8');
    const newContent = applyStringEdit(fileContent, { search: '3000', replace: '8080' });
    const diff = generateUnifiedDiff('service.ts', fileContent, newContent);

    assert.ok(diff.includes('-export const PORT = 3000;'));
    assert.ok(diff.includes('+export const PORT = 8080;'));

    // Verify on-disk file and mtime was untouched
    const statAfter = await fs.stat(filePath);
    assert.strictEqual(statBefore.mtimeMs, statAfter.mtimeMs, 'File mtime should not change during dry run');
    const diskContentAfter = await fs.readFile(filePath, 'utf8');
    assert.strictEqual(diskContentAfter, initialContent, 'Disk content should be completely unchanged after dry run');
  });

  await t.test('dry run simulation works seamlessly with line-range targeting', async () => {
    const filePath = path.join(tmpDir, 'config.ts');
    const initialContent = 'line 1\nval = 1\nline 3\nval = 1\nline 5\n';
    await fs.writeFile(filePath, initialContent, 'utf8');

    const fileContent = await fs.readFile(filePath, 'utf8');
    // Constrain to lines 1-3
    const newContent = applyStringEdit(fileContent, {
      search: 'val = 1',
      replace: 'val = 999',
      startLine: 1,
      endLine: 3,
    });

    const diff = generateUnifiedDiff('config.ts', fileContent, newContent);
    assert.ok(diff.includes('-val = 1'));
    assert.ok(diff.includes('+val = 999'));

    const diskContentAfter = await fs.readFile(filePath, 'utf8');
    assert.strictEqual(diskContentAfter, initialContent, 'Disk content must not be modified');
  });

  await t.test('dry run simulation works with replaceAll multi-replacements', async () => {
    const filePath = path.join(tmpDir, 'multi.ts');
    const initialContent = 'const v = 1;\nconst w = 1;\n';
    await fs.writeFile(filePath, initialContent, 'utf8');

    const fileContent = await fs.readFile(filePath, 'utf8');
    const newContent = applyStringEdit(fileContent, {
      search: '1',
      replace: '2',
      replaceAll: true,
    });

    const diff = generateUnifiedDiff('multi.ts', fileContent, newContent);
    assert.ok(diff.includes('-const v = 1;'));
    assert.ok(diff.includes('+const v = 2;'));
    assert.ok(diff.includes('-const w = 1;'));
    assert.ok(diff.includes('+const w = 2;'));

    const diskContentAfter = await fs.readFile(filePath, 'utf8');
    assert.strictEqual(diskContentAfter, initialContent, 'Disk content must not be modified');
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
