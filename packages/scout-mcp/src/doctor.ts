/**
 * Scout MCP Doctor — System and Environment Diagnostics.
 * Verifies Node.js runtime, git installation, worktree support, and filesystem permissions.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execFileAsync = promisify(execFile);

export interface DoctorCheck {
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  message: string;
  details?: string;
}

export interface DoctorReport {
  overallStatus: 'PASS' | 'WARN' | 'FAIL';
  checks: DoctorCheck[];
}

/**
 * Checks that Node.js meets minimum runtime requirements (>= 18.0.0).
 */
export function checkNodeRuntime(): DoctorCheck {
  const version = process.version;
  const match = version.match(/^v(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return {
      name: 'Node.js Runtime',
      status: 'WARN',
      message: `Unrecognized Node version format: ${version}`,
    };
  }
  const major = parseInt(match[1], 10);
  if (major < 18) {
    return {
      name: 'Node.js Runtime',
      status: 'FAIL',
      message: `Node.js >= 18.0.0 required, found ${version}`,
    };
  }
  return {
    name: 'Node.js Runtime',
    status: 'PASS',
    message: `Compatible runtime: ${version} (>= 18.0.0)`,
  };
}

/**
 * Checks that git is installed and meets version requirements (>= 2.20.0).
 */
export async function checkGitInstallation(): Promise<DoctorCheck> {
  try {
    const { stdout } = await execFileAsync('git', ['--version']);
    const match = stdout.match(/(\d+)\.(\d+)\.?(\d+)?/);
    if (!match) {
      return {
        name: 'Git Version',
        status: 'WARN',
        message: `Git installed but version unparsed: ${stdout.trim()}`,
      };
    }
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    if (major < 2 || (major === 2 && minor < 20)) {
      return {
        name: 'Git Version',
        status: 'FAIL',
        message: `Git >= 2.20.0 required for reliable worktree support, found ${stdout.trim()}`,
      };
    }
    return {
      name: 'Git Version',
      status: 'PASS',
      message: `Git installed: ${stdout.trim()} (>= 2.20.0)`,
    };
  } catch (err: any) {
    return {
      name: 'Git Version',
      status: 'FAIL',
      message: `Git executable not found in PATH: ${err.message}`,
    };
  }
}

/**
 * Checks git worktree support by running `git worktree list`.
 */
export async function checkGitWorktreeSupport(cwd: string = process.cwd()): Promise<DoctorCheck> {
  try {
    await execFileAsync('git', ['worktree', 'list'], { cwd });
    return {
      name: 'Git Worktree Support',
      status: 'PASS',
      message: 'Git worktree command is available and functional',
    };
  } catch (err: any) {
    // If it's simply not inside a git repository, that is a warning, not a missing capability
    if (err.message && err.message.includes('not a git repository')) {
      return {
        name: 'Git Worktree Support',
        status: 'WARN',
        message: 'Git worktree support verified (current working directory is not a git repository)',
      };
    }
    return {
      name: 'Git Worktree Support',
      status: 'FAIL',
      message: `Git worktree verification failed: ${err.message}`,
    };
  }
}

/**
 * Checks that the local state directory (.scout-tmp) is writable.
 */
export async function checkFilesystemPermissions(cwd: string = process.cwd()): Promise<DoctorCheck> {
  const targetDir = path.join(cwd, '.scout-tmp');
  const probeFile = path.join(targetDir, `.doctor-probe-${Date.now()}.tmp`);
  try {
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(probeFile, 'scout-doctor-ok', 'utf8');
    await fs.unlink(probeFile);
    return {
      name: 'Local State Storage',
      status: 'PASS',
      message: `Directory ${targetDir} is writable`,
    };
  } catch (err: any) {
    return {
      name: 'Local State Storage',
      status: 'FAIL',
      message: `Cannot write to ${targetDir}: ${err.message}`,
    };
  }
}

/**
 * Runs all diagnostic checks and aggregates report.
 */
export async function runDoctorDiagnostics(cwd: string = process.cwd()): Promise<DoctorReport> {
  const nodeCheck = checkNodeRuntime();
  const gitCheck = await checkGitInstallation();
  const worktreeCheck = await checkGitWorktreeSupport(cwd);
  const fsCheck = await checkFilesystemPermissions(cwd);

  const checks = [nodeCheck, gitCheck, worktreeCheck, fsCheck];

  let overallStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
  if (checks.some((c) => c.status === 'FAIL')) {
    overallStatus = 'FAIL';
  } else if (checks.some((c) => c.status === 'WARN')) {
    overallStatus = 'WARN';
  }

  return {
    overallStatus,
    checks,
  };
}

/**
 * Pretty prints diagnostic report to stdout.
 */
export function formatDoctorReport(report: DoctorReport): string {
  const symbols = {
    PASS: '✓',
    WARN: '⚠',
    FAIL: '✗',
  };

  const lines = [
    '=== Scout MCP Doctor Diagnostics ===',
    '',
    ...report.checks.map((c) => `  [${symbols[c.status]}] ${c.name}: ${c.message}`),
    '',
    `Result: ${report.overallStatus === 'PASS' ? 'All diagnostic checks passed successfully.' : report.overallStatus === 'WARN' ? 'Diagnostics passed with warnings.' : 'One or more critical checks failed.'}`,
  ];

  return lines.join('\n');
}
