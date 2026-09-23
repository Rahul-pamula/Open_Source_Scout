import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export async function runAdvisoryValidation(cwd: string = process.cwd()) {
  const packageJsonPath = path.join(cwd, 'package.json');
  let command = '';

  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (pkg.scripts && pkg.scripts['scout:validate']) {
      command = 'npm run scout:validate';
    }
  }

    if (!command) {
      return {
        validation_ran: false,
        validation_passed: true,
        stdout: 'No scout:validate script found in package.json. Skipping validation.',
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
