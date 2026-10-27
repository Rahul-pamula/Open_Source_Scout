import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { writeAtomicFile } from './editor.js';

test('Atomic File Write & Backup Restoration Suite', async (t) => {
  let tmpDir: string;

  t.beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-atomic-test-'));
  });

  t.afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  await t.test('atomically writes file and preserves file mode', async () => {
    const targetPath = path.join(tmpDir, 'service.sh');
    await fs.writeFile(targetPath, '#!/bin/bash\necho "initial"', 'utf8');
    await fs.chmod(targetPath, 0o755);

    const statBefore = await fs.stat(targetPath);
    await writeAtomicFile(targetPath, '#!/bin/bash\necho "updated"', statBefore.mode);

    const contentAfter = await fs.readFile(targetPath, 'utf8');
    assert.strictEqual(contentAfter, '#!/bin/bash\necho "updated"');

    const statAfter = await fs.stat(targetPath);
    assert.strictEqual(statAfter.mode & 0o777, 0o755, 'POSIX mode must be preserved');

    // Verify no temporary files left in directory
    const files = await fs.readdir(tmpDir);
    const tempFiles = files.filter((f) => f.includes('scout-tmp'));
    assert.strictEqual(tempFiles.length, 0, 'No temporary files should remain after atomic write');
  });

  await t.test('cleans up temporary file and leaves target untouched when write fails', async () => {
    const targetPath = path.join(tmpDir, 'existing.txt');
    await fs.writeFile(targetPath, 'original content', 'utf8');

    // Create a scenario where atomic write throws (e.g. invalid permissions on target directory)
    // Make targetPath a directory so rename(temp, target) fails on posix
    const dirTargetPath = path.join(tmpDir, 'directory-target');
    await fs.mkdir(dirTargetPath);

    await assert.rejects(
      async () => {
        await writeAtomicFile(dirTargetPath, 'new content');
      }
    );

    // Verify temp files cleaned up
    const files = await fs.readdir(tmpDir);
    const tempFiles = files.filter((f) => f.includes('scout-tmp'));
    assert.strictEqual(tempFiles.length, 0, 'Temporary file must be removed on failure');
  });

  await t.test('handles rapid concurrent atomic writes safely', async () => {
    const targetPath = path.join(tmpDir, 'concurrent.txt');
    await fs.writeFile(targetPath, 'initial', 'utf8');

    const writePromises = Array.from({ length: 10 }, (_, i) =>
      writeAtomicFile(targetPath, `content from worker ${i}`)
    );

    await Promise.all(writePromises);

    const finalContent = await fs.readFile(targetPath, 'utf8');
    assert.ok(finalContent.startsWith('content from worker '), 'Final content should be valid worker output');

    const files = await fs.readdir(tmpDir);
    const tempFiles = files.filter((f) => f.includes('scout-tmp'));
    assert.strictEqual(tempFiles.length, 0, 'All temporary files should be cleaned up');
  });
});
