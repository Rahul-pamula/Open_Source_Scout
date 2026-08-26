import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliPath = path.resolve(__dirname, '../bin/setup.js');
const tempDir = path.resolve(process.cwd(), '.scout-tmp');
const tempEnvPath = path.resolve(tempDir, '.env.temp');

function runCLI(mockSupabaseScript) {
  // Create a temporary mock bin directory
  const mockBinDir = path.join(__dirname, 'mock-bin');
  if (!fs.existsSync(mockBinDir)) fs.mkdirSync(mockBinDir);
  
  const mockSupabasePath = path.join(mockBinDir, 'supabase');
  fs.writeFileSync(mockSupabasePath, mockSupabaseScript);
  fs.chmodSync(mockSupabasePath, 0o755);

  const mockGitPath = path.join(mockBinDir, 'git');
  fs.writeFileSync(mockGitPath, `#!/bin/bash
if [ "$1" == "clone" ]; then
  mkdir -p "$5"
fi
exit 0
`);
  fs.chmodSync(mockGitPath, 0o755);

  return new Promise((resolve) => {
    const child = spawn('node', [cliPath], {
      env: {
        ...process.env,
        PATH: `${mockBinDir}:${process.env.PATH}`,
        SCOUT_ACCESS_TOKEN: 'fake_access_token',
        SCOUT_PROJECT_ID: 'fake_project_id',
        SCOUT_GITHUB_TOKEN: 'fake_github_token',
        SCOUT_GROQ_KEY: 'fake_groq_key'
      }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => stdout += data.toString());
    child.stderr.on('data', (data) => stderr += data.toString());

    child.on('close', (code) => {
      // Cleanup mock bin
      fs.rmSync(mockBinDir, { recursive: true, force: true });
      resolve({ code, stdout, stderr });
    });
  });
}

test('CLI Setup - Successful run deletes .env.temp', async () => {
  const mockScript = `#!/bin/bash\nexit 0\n`;
  const result = await runCLI(mockScript);
  
  assert.strictEqual(result.code, 0, 'CLI should exit with 0 on success');
  assert.ok(!fs.existsSync(tempEnvPath), '.env.temp should be deleted after success');
  assert.ok(!result.stdout.includes('fake_github_token'), 'Credentials should not be logged to stdout');
  assert.ok(!result.stderr.includes('fake_github_token'), 'Credentials should not be logged to stderr');
});

test('CLI Setup - Supabase secrets failure deletes .env.temp', async () => {
  // Fail specifically when 'secrets' is the first argument
  const mockScript = `#!/bin/bash
if [ "$1" == "secrets" ]; then
  exit 1
fi
exit 0
`;
  const result = await runCLI(mockScript);
  
  assert.strictEqual(result.code, 1, 'CLI should exit with 1 on failure');
  assert.ok(!fs.existsSync(tempEnvPath), '.env.temp should be deleted even on failure');
  assert.ok(result.stdout.includes('Failed to set secrets'), 'Should print failure message');
});

test('CLI Setup - Partial deployment detected', async () => {
  // Fail specifically when 'db push' is called and output "42710" to stderr
  const mockScript = `#!/bin/bash
if [ "$1" == "db" ] && [ "$2" == "push" ]; then
  echo "ERROR: relation already exists" >&2
  echo "SQLSTATE: 42710" >&2
  exit 1
fi
exit 0
`;
  const result = await runCLI(mockScript);
  
  assert.strictEqual(result.code, 1, 'CLI should exit with 1 on failure');
  assert.ok(result.stdout.includes('Partial Deployment Detected!'), 'Should detect partial deployment from stderr');
  assert.ok(result.stdout.includes('Manually remove the conflicting object'), 'Should provide safe recovery instructions');
});

test('CLI Setup - Unexpected exception triggers cleanup', async () => {
  // If the supabase CLI randomly crashes with signal 9 (SIGKILL) or exit 255
  const mockScript = `#!/bin/bash
if [ "$1" == "secrets" ]; then
  kill -9 $$
fi
exit 0
`;
  const result = await runCLI(mockScript);
  
  assert.strictEqual(result.code, 1, 'CLI should exit with 1 on exception');
  assert.ok(!fs.existsSync(tempEnvPath), '.env.temp should be deleted on unexpected process crash');
});
