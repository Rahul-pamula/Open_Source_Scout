import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { applyStringEdit } from './editor.js';

test('File Permissions Preservation Test Suite', async (t) => {
  let tmpDir: string;

  t.beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-permissions-test-'));
  });

  t.afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  await t.test('preserves POSIX executable bit across edits', async () => {
    const scriptPath = path.join(tmpDir, 'run.sh');
    await fs.writeFile(scriptPath, '#!/bin/bash\necho "v1"\n', 'utf8');
    await fs.chmod(scriptPath, 0o755);

    const statsBefore = await fs.stat(scriptPath);
    const modeBefore = statsBefore.mode & 0o777;
    assert.strictEqual(modeBefore, 0o755, 'Script should initially be mode 0755');

    // Simulate edit with mode restoration
    const content = await fs.readFile(scriptPath, 'utf8');
    const edited = applyStringEdit(content, { search: 'v1', replace: 'v2' });
    await fs.writeFile(scriptPath, edited, 'utf8');
    await fs.chmod(scriptPath, statsBefore.mode);

    const statsAfter = await fs.stat(scriptPath);
    const modeAfter = statsAfter.mode & 0o777;
    assert.strictEqual(modeAfter, 0o755, 'Script should retain 0755 mode after edit');

    const contentAfter = await fs.readFile(scriptPath, 'utf8');
    assert.ok(contentAfter.includes('echo "v2"'));
  });
});
