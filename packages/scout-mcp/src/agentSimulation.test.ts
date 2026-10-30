import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import { createWorktree, removeWorktree, getGitDiff } from './git.js';
import { applyStringEdit } from './editor.js';
import { streamReadFile } from './fileStream.js';
import { ProcessManager } from './harness.js';
import {
  recordTimelineEvent,
  getTimelineEvents,
  recordCommand,
  getEvidence,
} from './evidence.js';
import { saveLocalState, getLocalState } from './localState.js';

const execAsync = promisify(exec);

describe('Autonomous Agent End-to-End Simulation Suite', () => {
  let rootDir: string;
  let worktreePath: string | null = null;
  const sessionId = 'agent-sim-e2e-session-124';

  beforeEach(async () => {
    rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-agent-e2e-'));

    // Initialize a real Git repository with main branch
    await execAsync('git init -b main', { cwd: rootDir });
    await execAsync('git config user.name "Scout Agent"', { cwd: rootDir });
    await execAsync('git config user.email "agent@scout.dev"', { cwd: rootDir });
    await execAsync('git config commit.gpgsign false', { cwd: rootDir });

    // Seed buggy calculator file and test suite
    const srcDir = path.join(rootDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    const buggyCode = `// Math utility library
export function add(a, b) {
  return a - b; // BUG: subtraction instead of addition
}
`;
    await fs.writeFile(path.join(srcDir, 'math.mjs'), buggyCode, 'utf8');

    const testCode = `import assert from 'node:assert/strict';
import { add } from './src/math.mjs';

assert.strictEqual(add(2, 3), 5, 'add(2, 3) must equal 5');
console.log('Math test passed cleanly!');
`;
    await fs.writeFile(path.join(rootDir, 'test.mjs'), testCode, 'utf8');

    await execAsync('git add .', { cwd: rootDir });
    await execAsync('git commit -m "initial commit with buggy math module"', { cwd: rootDir });
  });

  afterEach(async () => {
    if (worktreePath) {
      try {
        await removeWorktree(sessionId, rootDir);
      } catch {}
    }
    await fs.rm(rootDir, { recursive: true, force: true });
    await fs.rm(path.join(process.cwd(), '.scout-tmp', 'sessions', sessionId), {
      recursive: true,
      force: true,
    });
  });

  it('successfully simulates autonomous agent lifecycle: init -> read -> edit -> run -> submit', async () => {
    const processManager = new ProcessManager();

    // -------------------------------------------------------------------------
    // Phase 1: Agent Session Initialization & Worktree Setup
    // -------------------------------------------------------------------------
    worktreePath = await createWorktree(sessionId, rootDir);
    assert.ok(worktreePath, 'Worktree must be created');
    assert.notStrictEqual(worktreePath, rootDir, 'Worktree must be isolated from root repository');

    await saveLocalState(
      {
        sessions: {
          [sessionId]: {
            source: 'local',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            last_heartbeat_at: new Date().toISOString(),
            starting_commit_hash: 'initial-commit',
            task_description: 'Fix bug in math addition calculation',
            workspace_path: worktreePath,
          },
        },
      },
      worktreePath,
    );

    await recordTimelineEvent(sessionId, 'START', 'Session initialized with isolated git worktree', {
      worktreePath,
      task: 'Fix math addition',
    });

    const activeState = await getLocalState(worktreePath);
    assert.strictEqual(activeState.sessions[sessionId].status, 'ACTIVE');

    // -------------------------------------------------------------------------
    // Phase 2: Agent Inspects Workspace & Reads Code
    // -------------------------------------------------------------------------
    const targetFilePath = path.join(worktreePath, 'src', 'math.mjs');
    const readResult = await streamReadFile(targetFilePath);
    assert.ok(readResult.content.includes('return a - b;'), 'Agent reads buggy code from worktree');

    // -------------------------------------------------------------------------
    // Phase 3: Agent Edits Code to Fix the Bug
    // -------------------------------------------------------------------------
    const updatedContent = applyStringEdit(readResult.content, {
      search: 'return a - b;',
      replace: 'return a + b;',
    });
    assert.ok(updatedContent.includes('return a + b;'), 'Edit replaced subtraction with addition');

    await fs.writeFile(targetFilePath, updatedContent, 'utf8');

    await recordTimelineEvent(sessionId, 'EDIT', 'Patched math.mjs addition operator', {
      file: 'src/math.mjs',
    });

    // -------------------------------------------------------------------------
    // Phase 4: Agent Executes Validation Test in Worktree
    // -------------------------------------------------------------------------
    const startTime = Date.now();
    const execResult = await processManager.runCommand(
      sessionId,
      'node test.mjs',
      worktreePath,
    );
    const durationMs = Date.now() - startTime;

    assert.strictEqual(execResult.exitCode, 0, 'Test suite must pass with exit code 0');
    assert.ok(
      execResult.stdout.includes('Math test passed cleanly!'),
      'Stdout must confirm test success',
    );

    await recordCommand(
      sessionId,
      'node test.mjs',
      execResult.exitCode,
      new Date().toISOString(),
      { duration_ms: durationMs },
    );

    // -------------------------------------------------------------------------
    // Phase 5: Agent Captures Git Diff & Verifies Worktree Isolation
    // -------------------------------------------------------------------------
    const gitDiff = await getGitDiff(worktreePath);
    assert.ok(gitDiff.includes('+  return a + b;'), 'Diff must show added fix');
    assert.ok(gitDiff.includes('-  return a - b;'), 'Diff must show removed bug');

    // Verify root repository was NOT touched
    const rootMathContent = await fs.readFile(path.join(rootDir, 'src', 'math.mjs'), 'utf8');
    assert.ok(
      rootMathContent.includes('return a - b;'),
      'Root repository must remain untouched and isolated',
    );

    // -------------------------------------------------------------------------
    // Phase 6: Agent Submits Task for Review
    // -------------------------------------------------------------------------
    await recordTimelineEvent(sessionId, 'SUBMIT', 'Completed task and submitted for review', {
      prUrl: 'https://github.com/org/repo/pull/124',
    });

    await saveLocalState(
      {
        sessions: {
          [sessionId]: {
            source: 'local',
            status: 'SUBMITTED',
            created_at: activeState.sessions[sessionId].created_at,
            last_heartbeat_at: new Date().toISOString(),
            starting_commit_hash: 'initial-commit',
            task_description: 'Fix bug in math addition calculation',
            workspace_path: worktreePath,
            pr_url: 'https://github.com/org/repo/pull/124',
          },
        },
      },
      worktreePath,
    );

    // -------------------------------------------------------------------------
    // Phase 7: Verification of Audit Trail & Telemetry
    // -------------------------------------------------------------------------
    const finalState = await getLocalState(worktreePath);
    assert.strictEqual(finalState.sessions[sessionId].status, 'SUBMITTED');
    assert.strictEqual(finalState.sessions[sessionId].pr_url, 'https://github.com/org/repo/pull/124');

    const timeline = await getTimelineEvents(sessionId);
    assert.strictEqual(timeline.length, 4, 'Timeline must record 4 events: START, EDIT, EXEC, SUBMIT');
    assert.strictEqual(timeline[0].type, 'START');
    assert.strictEqual(timeline[1].type, 'EDIT');
    assert.strictEqual(timeline[2].type, 'EXEC');
    assert.strictEqual(timeline[3].type, 'SUBMIT');

    const evidence = await getEvidence(sessionId);
    assert.strictEqual(evidence.commands.length, 1);
    assert.strictEqual(evidence.commands[0].command, 'node test.mjs');
    assert.strictEqual(evidence.commands[0].exitCode, 0);
  });
});
