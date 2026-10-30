import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCliAction, SCOUT_MCP_VERSION, SCOUT_MCP_HELP } from './cli.js';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFileAsync = promisify(execFile);

describe('Scout MCP CLI Flags & Help Suite', () => {
  it('1. parseCliAction maps --version and -v correctly', () => {
    assert.equal(parseCliAction(['--version']), 'version');
    assert.equal(parseCliAction(['-v']), 'version');
    assert.equal(parseCliAction(['version']), 'version');
  });

  it('2. parseCliAction maps --help and -h correctly', () => {
    assert.equal(parseCliAction(['--help']), 'help');
    assert.equal(parseCliAction(['-h']), 'help');
    assert.equal(parseCliAction(['help']), 'help');
  });

  it('3. parseCliAction maps doctor command and defaults to run', () => {
    assert.equal(parseCliAction(['doctor']), 'doctor');
    assert.equal(parseCliAction([]), 'run');
    assert.equal(parseCliAction(['run']), 'run');
    assert.equal(parseCliAction(['unknown-flag']), 'run');
  });

  it('4. SCOUT_MCP_VERSION is valid semver string', () => {
    assert.match(SCOUT_MCP_VERSION, /^\d+\.\d+\.\d+$/);
  });

  it('5. SCOUT_MCP_HELP contains command synopsis and documentation link', () => {
    assert.ok(SCOUT_MCP_HELP.includes('Usage:'));
    assert.ok(SCOUT_MCP_HELP.includes('scout-mcp [command|options]'));
    assert.ok(SCOUT_MCP_HELP.includes('doctor'));
    assert.ok(SCOUT_MCP_HELP.includes('--version'));
    assert.ok(SCOUT_MCP_HELP.includes('--help'));
    assert.ok(SCOUT_MCP_HELP.includes('https://github.com/Rahul-pamula/Open_Source_Scout'));
  });

  it('6. CLI binary execution responds cleanly to --version and --help', async () => {
    const binaryPath = path.resolve(process.cwd(), 'dist/index.js');
    const childEnv = { ...process.env };
    delete childEnv.NODE_TEST_CONTEXT;

    const vResult = await execFileAsync('node', [binaryPath, '--version'], { env: childEnv });
    assert.equal(vResult.stdout.trim(), SCOUT_MCP_VERSION);

    const hResult = await execFileAsync('node', [binaryPath, '--help'], { env: childEnv });
    assert.ok(hResult.stdout.includes('Scout MCP Server (open-source-scout-mcp)'));
  });
});
