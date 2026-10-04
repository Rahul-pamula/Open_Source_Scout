import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export async function runAdvisoryValidation(cwd: string = process.cwd()) {
  const packageJsonPath = path.join(cwd, 'package.json');
  const requirementsTxtPath = path.join(cwd, 'requirements.txt');
  const pytestIniPath = path.join(cwd, 'pytest.ini');
  const cargoTomlPath = path.join(cwd, 'Cargo.toml');
  
  let command = '';

  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (pkg.scripts && pkg.scripts['scout:validate']) {
        command = 'npm run scout:validate';
      } else if (pkg.scripts && pkg.scripts['test']) {
        command = 'npm test';
      }
    } catch (e) {
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
      } catch (e) {
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
      stdout: 'No standard validation command detected (scout:validate, npm test, pytest, or cargo test). Skipping validation.',
      stderr: '',
      exit_code: null
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
      exit_code: 0
    };
  } catch (e: any) {
    const exitCode = typeof e.code === 'number' ? e.code : null;
    const timedOut = e.killed && e.signal === 'SIGTERM';

    return {
      validation_ran: true,
      validation_passed: false,
      stdout: e.stdout || '',
      stderr: timedOut ? `Validation timed out after 5 minutes.\n${e.stderr || ''}` : (e.stderr || e.message || 'Unknown error'),
      exit_code: exitCode
    };
  }
}
