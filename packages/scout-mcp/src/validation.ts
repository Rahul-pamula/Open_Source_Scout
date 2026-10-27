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
 * Checks whether the project is configured for Deno.
 */
export function detectDenoProject(cwd: string = process.cwd()): boolean {
  return fs.existsSync(path.join(cwd, 'deno.json')) || fs.existsSync(path.join(cwd, 'deno.jsonc'));
}

/**
 * Detects if a project has test files matching node:test or tsx --test runner patterns.
 */
export function detectNodeTestRunner(cwd: string = process.cwd()): string | null {
  const candidateDirs = [cwd, path.join(cwd, 'test'), path.join(cwd, 'tests'), path.join(cwd, 'src')];

  let hasTsTests = false;
  let hasJsTests = false;

  for (const dir of candidateDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (/\.(test|spec)\.ts$/.test(file)) {
          hasTsTests = true;
          break;
        }
        if (/\.(test|spec)\.js$/.test(file) || /\.(test|spec)\.mjs$/.test(file) || /\.(test|spec)\.cjs$/.test(file)) {
          hasJsTests = true;
        }
      }
      if (hasTsTests) break;
    } catch {
      // Ignore directory read errors
    }
  }

  if (hasTsTests) {
    return 'npx tsx --test';
  }
  if (hasJsTests) {
    return 'node --test';
  }
  return null;
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

/**
 * Resolves the appropriate validation command for a repository based on its project configuration.
 */
export function resolveValidationCommand(cwd: string = process.cwd()): string | null {
  // 1. Deno projects
  if (detectDenoProject(cwd)) {
    return 'deno test';
  }

  // 2. Node.js projects with package.json
  const packageJsonPath = path.join(cwd, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (pkg.scripts) {
        const pm = detectNodePackageManager(cwd);
        const nodeCmd = buildNodeValidationCommand(pm, pkg.scripts);
        if (nodeCmd) {
          return nodeCmd;
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  // 3. Standalone node:test or tsx runner detection
  const nativeTestCmd = detectNodeTestRunner(cwd);
  if (nativeTestCmd) {
    return nativeTestCmd;
  }

  // 4. Python pytest
  const pytestIniPath = path.join(cwd, 'pytest.ini');
  const requirementsTxtPath = path.join(cwd, 'requirements.txt');
  if (fs.existsSync(pytestIniPath)) {
    return 'pytest';
  }
  if (fs.existsSync(requirementsTxtPath)) {
    try {
      const reqs = fs.readFileSync(requirementsTxtPath, 'utf8');
      if (reqs.includes('pytest')) {
        return 'pytest';
      }
    } catch {
      // Ignore read errors
    }
  }

  // 5. Rust cargo
  const cargoTomlPath = path.join(cwd, 'Cargo.toml');
  if (fs.existsSync(cargoTomlPath)) {
    return 'cargo test';
  }

  // 6. Go projects
  if (detectGoProject(cwd)) {
    return 'go test ./...';
  }

  // 7. Java / Kotlin (Gradle / Maven)
  const javaCmd = detectJavaProject(cwd);
  if (javaCmd) {
    return javaCmd;
  }

  return null;
}

/**
 * Checks whether the project is a Go module or workspace.
 */
export function detectGoProject(cwd: string = process.cwd()): boolean {
  return fs.existsSync(path.join(cwd, 'go.mod')) || fs.existsSync(path.join(cwd, 'go.work'));
}

/**
 * Checks whether the project is a Java/Kotlin project using Gradle or Maven.
 */
export function detectJavaProject(cwd: string = process.cwd()): string | null {
  if (fs.existsSync(path.join(cwd, 'gradlew'))) {
    return './gradlew test';
  }
  if (fs.existsSync(path.join(cwd, 'gradlew.bat'))) {
    return './gradlew test';
  }
  if (fs.existsSync(path.join(cwd, 'build.gradle')) || fs.existsSync(path.join(cwd, 'build.gradle.kts'))) {
    return 'gradle test';
  }
  if (fs.existsSync(path.join(cwd, 'mvnw'))) {
    return './mvnw test';
  }
  if (fs.existsSync(path.join(cwd, 'pom.xml'))) {
    return 'mvn test';
  }
  return null;
}

export async function runAdvisoryValidation(cwd: string = process.cwd()) {
  const command = resolveValidationCommand(cwd);

  if (!command) {
    return {
      validation_ran: false,
      validation_passed: true,
      stdout:
        'No standard validation command detected (scout:validate, test runner, deno test, pytest, cargo test, go test, gradle, or mvn). Skipping validation.',
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
