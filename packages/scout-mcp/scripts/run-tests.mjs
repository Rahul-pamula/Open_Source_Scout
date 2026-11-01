import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const srcDir = path.join(pkgRoot, 'src');
const distIndex = path.join(pkgRoot, 'dist', 'index.js');

// Auto-build binary if not present (ensures CLI binary tests pass)
if (!fs.existsSync(distIndex)) {
  console.log('[test-runner] Building packages/scout-mcp before test execution...');
  execSync('npm run build', { cwd: pkgRoot, stdio: 'inherit' });
}

// Recursively find all test files
function findTestFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTestFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      results.push(path.relative(pkgRoot, fullPath).replace(/\\/g, '/'));
    }
  }
  return results;
}

const testFiles = findTestFiles(srcDir);
const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

const child = spawn(npxCmd, ['tsx', '--test', ...testFiles], {
  cwd: pkgRoot,
  stdio: 'inherit',
  shell: isWindows,
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
