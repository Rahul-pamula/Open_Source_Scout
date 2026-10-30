import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkNodeRuntime,
  checkGitInstallation,
  checkGitWorktreeSupport,
  checkFilesystemPermissions,
  runDoctorDiagnostics,
  formatDoctorReport,
} from './doctor.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('Scout MCP Doctor Diagnostics Suite', () => {
  it('1. checkNodeRuntime passes on supported Node environment', () => {
    const result = checkNodeRuntime();
    assert.equal(result.name, 'Node.js Runtime');
    assert.equal(result.status, 'PASS');
    assert.ok(result.message.includes(process.version));
  });

  it('2. checkGitInstallation detects installed git version >= 2.20.0', async () => {
    const result = await checkGitInstallation();
    assert.equal(result.name, 'Git Version');
    assert.equal(result.status, 'PASS');
    assert.ok(result.message.includes('git version'));
  });

  it('3. checkGitWorktreeSupport verifies git worktree functionality', async () => {
    const result = await checkGitWorktreeSupport(process.cwd());
    assert.equal(result.name, 'Git Worktree Support');
    assert.ok(result.status === 'PASS' || result.status === 'WARN');
  });

  it('4. checkFilesystemPermissions verifies write permissions to .scout-tmp', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-doctor-test-'));
    try {
      const result = await checkFilesystemPermissions(tempDir);
      assert.equal(result.name, 'Local State Storage');
      assert.equal(result.status, 'PASS');
      assert.ok(result.message.includes('is writable'));
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('5. runDoctorDiagnostics runs all checks and computes overall status', async () => {
    const report = await runDoctorDiagnostics();
    assert.ok(report.checks.length >= 4);
    assert.ok(report.overallStatus === 'PASS' || report.overallStatus === 'WARN');
  });

  it('6. formatDoctorReport renders report with status symbols', () => {
    const sampleReport = {
      overallStatus: 'PASS' as const,
      checks: [
        { name: 'Node.js Runtime', status: 'PASS' as const, message: 'v20.0.0' },
        { name: 'Git Version', status: 'PASS' as const, message: 'git version 2.40.0' },
        { name: 'Git Worktree Support', status: 'WARN' as const, message: 'worktree warning' },
        { name: 'Local State Storage', status: 'FAIL' as const, message: 'permission denied' },
      ],
    };

    const formatted = formatDoctorReport(sampleReport);
    assert.ok(formatted.includes('=== Scout MCP Doctor Diagnostics ==='));
    assert.ok(formatted.includes('[✓] Node.js Runtime: v20.0.0'));
    assert.ok(formatted.includes('[⚠] Git Worktree Support: worktree warning'));
    assert.ok(formatted.includes('[✗] Local State Storage: permission denied'));
  });
});
