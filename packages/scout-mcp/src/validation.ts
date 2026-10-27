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

  // 8. Makefile test target
  const makeCmd = detectMakefileTestTarget(cwd);
  if (makeCmd) {
    return makeCmd;
  }

  // 9. .NET projects (C# / F#)
  if (detectDotNetProject(cwd)) {
    return 'dotnet test';
  }

  return null;
}

/**
 * Checks whether the project is a .NET project (.sln or .csproj/.fsproj).
 */
export function detectDotNetProject(cwd: string = process.cwd()): boolean {
  try {
    const files = fs.readdirSync(cwd);
    return files.some((f) => f.endsWith('.sln') || f.endsWith('.csproj') || f.endsWith('.fsproj'));
  } catch {
    return false;
  }
}

/**
 * Checks whether the project is a Go module or workspace.
 */
export function detectGoProject(cwd: string = process.cwd()): boolean {
  return fs.existsSync(path.join(cwd, 'go.mod')) || fs.existsSync(path.join(cwd, 'go.work'));
}

/**
 * Checks whether the project has a Makefile with a test or check target.
 */
export function detectMakefileTestTarget(cwd: string = process.cwd()): string | null {
  const makefiles = ['Makefile', 'makefile', 'GNUmakefile'];
  for (const mf of makefiles) {
    const fullPath = path.join(cwd, mf);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (/^test\s*:/m.test(content)) {
          return 'make test';
        }
        if (/^check\s*:/m.test(content)) {
          return 'make check';
        }
      } catch {
        // Ignore read errors
      }
    }
  }
  return null;
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

export interface MonorepoWorkspace {
  type: 'npm' | 'pnpm' | 'yarn';
  packages: Array<{ name: string; path: string }>;
}

/**
 * Scans directories like packages/ and apps/ for monorepo packages.
 */
export function findWorkspacePackages(cwd: string = process.cwd()): Array<{ name: string; path: string }> {
  const result: Array<{ name: string; path: string }> = [];
  const rootDirs = ['packages', 'apps', 'libs', 'modules'];

  for (const root of rootDirs) {
    const parentDir = path.join(cwd, root);
    if (!fs.existsSync(parentDir)) continue;
    try {
      const entries = fs.readdirSync(parentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pkgPath = path.join(parentDir, entry.name);
          const pkgJson = path.join(pkgPath, 'package.json');
          if (fs.existsSync(pkgJson)) {
            try {
              const data = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
              if (data.name) {
                result.push({ name: data.name, path: pkgPath });
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch {
      // Ignore directory read errors
    }
  }

  return result;
}

/**
 * Detects whether the repository is a monorepo workspace (pnpm or npm/yarn workspaces).
 */
export function detectMonorepoWorkspaces(cwd: string = process.cwd()): MonorepoWorkspace | null {
  const pnpmWsPath = path.join(cwd, 'pnpm-workspace.yaml');
  if (fs.existsSync(pnpmWsPath)) {
    const pkgs = findWorkspacePackages(cwd);
    return { type: 'pnpm', packages: pkgs };
  }

  const pkgJsonPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      if (pkg.workspaces) {
        const pkgs = findWorkspacePackages(cwd);
        const pm = detectNodePackageManager(cwd);
        const wsType = pm === 'pnpm' ? 'pnpm' : pm === 'yarn' ? 'yarn' : 'npm';
        return { type: wsType, packages: pkgs };
      }
    } catch {
      // Ignore parse errors
    }
  }

  return null;
}

/**
 * Finds the workspace package matching a given file or directory path.
 */
export function findMatchingWorkspacePackage(
  targetPath: string,
  workspaces: MonorepoWorkspace,
): { name: string; path: string } | null {
  const normalizedTarget = path.resolve(targetPath);
  for (const pkg of workspaces.packages) {
    const normalizedPkg = path.resolve(pkg.path);
    if (normalizedTarget === normalizedPkg || normalizedTarget.startsWith(normalizedPkg + path.sep)) {
      return pkg;
    }
  }
  return null;
}

/**
 * Builds a targeted test command scoped to a specific workspace package.
 */
export function buildWorkspaceScopedTestCommand(
  workspace: MonorepoWorkspace,
  packageName: string,
): string {
  switch (workspace.type) {
    case 'pnpm':
      return `pnpm --filter ${packageName} test`;
    case 'yarn':
      return `yarn workspace ${packageName} test`;
    case 'npm':
    default:
      return `npm test --workspace=${packageName}`;
  }
}

export const MAX_VALIDATION_OUTPUT_BYTES = 64 * 1024; // 64KB

/**
 * Caps output strings to a maximum byte size with a clear truncation warning banner and tail preservation.
 */
export function capValidationOutput(
  output: string,
  maxBytes: number = MAX_VALIDATION_OUTPUT_BYTES,
): string {
  if (!output) return '';
  const byteLength = Buffer.byteLength(output, 'utf8');
  if (byteLength <= maxBytes) {
    return output;
  }

  const banner = `\n\n... [TRUNCATED: Output exceeded ${Math.round(maxBytes / 1024)}KB limit; omitted ${byteLength - maxBytes} bytes] ...\n\n`;
  const bannerBytes = Buffer.byteLength(banner, 'utf8');
  const availableBytes = Math.max(0, maxBytes - bannerBytes);

  const headBytes = Math.floor(availableBytes * 0.25);
  const tailBytes = availableBytes - headBytes;

  const buf = Buffer.from(output, 'utf8');
  const headStr = buf.subarray(0, headBytes).toString('utf8');
  const tailStr = buf.subarray(buf.length - tailBytes).toString('utf8');

  return headStr + banner + tailStr;
}

export interface ValidationSummary {
  total: number | null;
  passed: number | null;
  failed: number | null;
  duration_ms: number | null;
}

/**
 * Parses test runner output to extract structured counts and duration.
 */
export function parseTestOutputSummary(output: string): ValidationSummary {
  let total: number | null = null;
  let passed: number | null = null;
  let failed: number | null = null;
  let duration_ms: number | null = null;

  // 1. Node test / tsx
  const nodeTestsMatch = output.match(/ℹ\s+tests\s+(\d+)/);
  if (nodeTestsMatch) total = parseInt(nodeTestsMatch[1], 10);

  const nodePassMatch = output.match(/ℹ\s+pass\s+(\d+)/);
  if (nodePassMatch) passed = parseInt(nodePassMatch[1], 10);

  const nodeFailMatch = output.match(/ℹ\s+fail\s+(\d+)/);
  if (nodeFailMatch) failed = parseInt(nodeFailMatch[1], 10);

  const nodeDurMatch = output.match(/ℹ\s+duration_ms\s+([\d.]+)/);
  if (nodeDurMatch) duration_ms = Math.round(parseFloat(nodeDurMatch[1]));

  // 2. Jest / Vitest / Pytest counts
  if (total === null) {
    const passedMatch = output.match(/(\d+)\s+passed/);
    const failedMatch = output.match(/(\d+)\s+failed/);
    const totalMatch = output.match(/(\d+)\s+total/);

    if (passedMatch) passed = parseInt(passedMatch[1], 10);
    if (failedMatch) failed = parseInt(failedMatch[1], 10);
    if (totalMatch) total = parseInt(totalMatch[1], 10);
    else if (passed !== null || failed !== null) {
      total = (passed || 0) + (failed || 0);
    }
  }

  // 3. Duration from 'in X.XXs' or 'Time: X.XX s'
  if (duration_ms === null) {
    const timeMatch = output.match(/(?:in|Time:)\s+([\d.]+)\s*s/);
    if (timeMatch) {
      duration_ms = Math.round(parseFloat(timeMatch[1]) * 1000);
    }
  }

  // 4. Cargo test format: test result: ok. 5 passed; 0 failed; finished in 0.05s
  if (total === null) {
    const cargoMatch = output.match(/test result:\s+\w+\.\s+(\d+)\s+passed;\s+(\d+)\s+failed;.*?finished in ([\d.]+)s/);
    if (cargoMatch) {
      passed = parseInt(cargoMatch[1], 10);
      failed = parseInt(cargoMatch[2], 10);
      total = passed + failed;
      duration_ms = Math.round(parseFloat(cargoMatch[3]) * 1000);
    }
  }

  return { total, passed, failed, duration_ms };
}

export async function runAdvisoryValidation(cwd: string = process.cwd(), changedFiles?: string[]) {
  let command: string | null = null;

  // If changed files are provided, attempt targeted monorepo workspace testing
  if (changedFiles && changedFiles.length > 0) {
    const ws = detectMonorepoWorkspaces(cwd);
    if (ws) {
      for (const file of changedFiles) {
        const fullFilePath = path.isAbsolute(file) ? file : path.join(cwd, file);
        const matched = findMatchingWorkspacePackage(fullFilePath, ws);
        if (matched) {
          command = buildWorkspaceScopedTestCommand(ws, matched.name);
          break;
        }
      }
    }
  }

  if (!command) {
    command = resolveValidationCommand(cwd);
  }

  if (!command) {
    return {
      validation_ran: false,
      validation_passed: true,
      stdout:
        'No standard validation command detected (scout:validate, test runner, deno test, pytest, cargo test, go test, gradle, mvn, make test, or dotnet test). Skipping validation.',
      stderr: '',
      exit_code: null,
      validation_summary: null,
    };
  }

  try {
    // 5-minute timeout for validation commands, up to 10MB exec buffer before capping
    const { stdout, stderr } = await execAsync(command, { cwd, timeout: 300000, maxBuffer: 10 * 1024 * 1024 });
    const fullLog = stdout + '\n' + stderr;
    return {
      validation_ran: true,
      validation_passed: true,
      stdout: capValidationOutput(stdout),
      stderr: capValidationOutput(stderr),
      exit_code: 0,
      validation_summary: parseTestOutputSummary(fullLog),
    };
  } catch (e: any) {
    const exitCode = typeof e.code === 'number' ? e.code : null;
    const timedOut = e.killed && e.signal === 'SIGTERM';
    const rawStderr = timedOut
      ? `Validation timed out after 5 minutes.\n${e.stderr || ''}`
      : e.stderr || e.message || 'Unknown error';
    const fullLog = (e.stdout || '') + '\n' + rawStderr;

    return {
      validation_ran: true,
      validation_passed: false,
      stdout: capValidationOutput(e.stdout || ''),
      stderr: capValidationOutput(rawStderr),
      exit_code: exitCode,
      validation_summary: parseTestOutputSummary(fullLog),
    };
  }
}
