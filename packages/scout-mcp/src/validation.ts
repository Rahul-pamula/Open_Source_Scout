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
      success: true,
      stdout: 'No scout:validate script found in package.json. Skipping validation.',
      stderr: ''
    };
  }

  try {
    // 5-minute timeout for validation commands
    const { stdout, stderr } = await execAsync(command, { cwd, timeout: 300000 });
    return {
      success: true,
      stdout,
      stderr
    };
  } catch (e: any) {
    return {
      success: false,
      stdout: e.stdout || '',
      stderr: e.stderr || e.message || 'Unknown error'
    };
  }
}
