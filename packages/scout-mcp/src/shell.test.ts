import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveShellCommand, ProcessManager } from './harness.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('Cross-Platform Shell Resolution & Execution Suite', () => {
  it('1. resolves standard sh -c on Unix-like operating systems (darwin, linux)', () => {
    const darwinRes = resolveShellCommand('echo "test"', 'darwin');
    assert.equal(darwinRes.shellBinary, 'sh');
    assert.deepEqual(darwinRes.shellArgs, ['-c', 'echo "test"']);

    const linuxRes = resolveShellCommand('npm test', 'linux');
    assert.equal(linuxRes.shellBinary, 'sh');
    assert.deepEqual(linuxRes.shellArgs, ['-c', 'npm test']);
  });

  it('2. resolves cmd.exe /d /s /c on Windows (win32)', () => {
    // With ComSpec defined
    const winComSpecRes = resolveShellCommand('dir /b', 'win32', {
      ComSpec: 'C:\\Windows\\System32\\cmd.exe',
    });
    assert.equal(winComSpecRes.shellBinary, 'C:\\Windows\\System32\\cmd.exe');
    assert.deepEqual(winComSpecRes.shellArgs, ['/d', '/s', '/c', 'dir /b']);

    // With COMSPEC defined in uppercase
    const winUpperRes = resolveShellCommand('dir', 'win32', {
      COMSPEC: 'C:\\Windows\\SysWOW64\\cmd.exe',
    });
    assert.equal(winUpperRes.shellBinary, 'C:\\Windows\\SysWOW64\\cmd.exe');
    assert.deepEqual(winUpperRes.shellArgs, ['/d', '/s', '/c', 'dir']);

    // Fallback when ComSpec not in environment
    const winFallbackRes = resolveShellCommand('echo hello', 'win32', {});
    assert.equal(winFallbackRes.shellBinary, 'cmd.exe');
    assert.deepEqual(winFallbackRes.shellArgs, ['/d', '/s', '/c', 'echo hello']);
  });

  it('3. handles commands with double quotes, flags, and multiline text', () => {
    const complexCmd = 'git commit -m "feat(test): multi-word commit\n\nCo-authored-by: user"';
    const res = resolveShellCommand(complexCmd, 'darwin');
    assert.equal(res.shellBinary, 'sh');
    assert.equal(res.shellArgs[1], complexCmd);
  });

  it('4. ProcessManager successfully executes commands using resolved shell', async () => {
    const pm = new ProcessManager();
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-shell-test-'));
    try {
      const result = await pm.runCommand(
        'test-shell-session',
        'echo "shell execution success"',
        tempDir,
      );
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.includes('shell execution success'));
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});
