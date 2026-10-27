import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export type NodePackageManager = 'pnpm' | 'yarn' | 'bun' | 'npm';

/**
 * Detects the JavaScript/TypeScript package manager from project lockfiles.
 */
export function detectNodePackageManager(cwd: string = process.cwd()): NodePackageManager {
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) {
    return 'yarn';
  }
  if (fs.existsSync(path.join(cwd, 'bun.lockb')) || fs.existsSync(path.join(cwd, 'bun.lock'))) {
    return 'bun';
  }
  return 'npm';
}

/**
 * Builds the validation command for Node.js projects based on package manager and available scripts.
 */
export function buildNodeValidationCommand(
  pm: NodePackageManager,
  scripts: Record<string, string>,
): string | null {
  const hasScoutValidate = Boolean(scripts['scout:validate']);
  const hasTest = Boolean(scripts['test']);

  if (!hasScoutValidate && !hasTest) {
    return null;
  }

  const scriptName = hasScoutValidate ? 'scout:validate' : 'test';

  switch (pm) {
    case 'pnpm':
      return scriptName === 'test' ? 'pnpm test' : `pnpm run ${scriptName}`;
    case 'yarn':
      return `yarn ${scriptName}`;
    case 'bun':
      return scriptName === 'test' ? 'bun test' : `bun run ${scriptName}`;
    case 'npm':
    default:
      return scriptName === 'test' ? 'npm test' : `npm run ${scriptName}`;
  }
}

export async function runAdvisoryValidation(cwd: string = process.cwd()) {
  const packageJsonPath = path.join(cwd, 'package.json');
  const requirementsTxtPath = path.join(cwd, 'requirements.txt');
  const pytestIniPath = path.join(cwd, 'pytest.ini');
  const cargoTomlPath = path.join(cwd, 'Cargo.toml');

  let command = '';

  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (pkg.scripts) {
        const pm = detectNodePackageManager(cwd);
        const nodeCmd = buildNodeValidationCommand(pm, pkg.scripts);
        if (nodeCmd) {
          command = nodeCmd;
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  if (!command) {
    if (fs.existsSync(pytestIniPath)) {
      command = 'pytest';
    } else if (fs.existsSync(requirementsTxtPath)) {
      try {
        const reqs = fs.readFileSync(requirementsTxtPath, 'utf8');
        if (reqs.includes('pytest')) {
          command = 'pytest';
        }
      } catch {
        // Ignore read errors
      }
    }
  }

  if (!command) {
    if (fs.existsSync(cargoTomlPath)) {
      command = 'cargo test';
    }
  }

  if (!command) {
    return {
      validation_ran: false,
      validation_passed: true,
      stdout:
        'No standard validation command detected (scout:validate, test runner, pytest, or cargo test). Skipping validation.',
      stderr: '',
      exit_code: null,
    };
  }

  try {
    // 5-minute timeout for validation commands
    const { stdout, stderr } = await execAsync(command, { cwd, timeout: 300000 });
    return {
      validation_ran: true,
      validation_passed: true,
      stdout,
      stderr,
      exit_code: 0,
    };
  } catch (e: any) {
    const exitCode = typeof e.code === 'number' ? e.code : null;
    const timedOut = e.killed && e.signal === 'SIGTERM';

    return {
      validation_ran: true,
      validation_passed: false,
      stdout: e.stdout || '',
      stderr: timedOut
        ? `Validation timed out after 5 minutes.\n${e.stderr || ''}`
        : e.stderr || e.message || 'Unknown error',
      exit_code: exitCode,
    };
  }
}
