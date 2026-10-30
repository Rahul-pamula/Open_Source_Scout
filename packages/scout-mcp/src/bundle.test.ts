import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { exportSessionBundle } from './bundle.js';
import { recordTimelineEvent, recordCommand, recordGitDiff } from './evidence.js';
import { saveLocalState } from './localState.js';

describe('MCP Export Session Bundle Suite', () => {
  const sessionId = 'test-bundle-session-109';
  let tempCwd: string;

  beforeEach(async () => {
    tempCwd = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-bundle-test-'));
    // Setup test local state
    await saveLocalState(
      {
        sessions: {
          [sessionId]: {
            session_id: sessionId,
            status: 'SUBMITTED',
            created_at: new Date().toISOString(),
            last_heartbeat_at: new Date().toISOString(),
            starting_commit_hash: '1234567890abcdef',
            task_description: 'Bundle test task',
            workspace_path: tempCwd,
            pr_url: 'https://github.com/org/repo/pull/42',
          },
        },
      },
      tempCwd,
    );

    // Populate evidence in tempCwd
    const origCwd = process.cwd();
    try {
      process.chdir(tempCwd);
      await recordGitDiff(sessionId, '--- a/file.ts\n+++ b/file.ts\n@@ -1 +1 @@\n-old\n+new\n');
      await recordCommand(sessionId, 'npm test', 0, new Date().toISOString());
      await recordTimelineEvent(sessionId, 'START', 'Test started');
      await recordTimelineEvent(sessionId, 'SUBMIT', 'Test submitted');
    } finally {
      process.chdir(origCwd);
    }
  });

  afterEach(async () => {
    await fs.rm(tempCwd, { recursive: true, force: true });
  });

  it('1. exports session bundle to tar.gz with correct manifest and sha256', async () => {
    const origCwd = process.cwd();
    try {
      process.chdir(tempCwd);
      const result = await exportSessionBundle(sessionId, undefined, tempCwd);

      assert.ok(result.bundlePath.endsWith('.tar.gz') || result.bundlePath.endsWith('.json'));
      assert.ok(result.sizeBytes > 0);
      assert.match(result.sha256, /^[a-f0-9]{64}$/);
      assert.deepEqual(result.filesIncluded.sort(), [
        'evidence.json',
        'manifest.json',
        'patch.diff',
        'session.json',
        'timeline.json',
      ]);

      const fileExists = await fs
        .stat(result.bundlePath)
        .then(() => true)
        .catch(() => false);
      assert.ok(fileExists);
    } finally {
      process.chdir(origCwd);
    }
  });

  it('2. supports custom output path for exported bundle', async () => {
    const customOutput = path.join(tempCwd, 'custom-exports', 'custom-audit.tar.gz');
    const origCwd = process.cwd();
    try {
      process.chdir(tempCwd);
      const result = await exportSessionBundle(sessionId, customOutput, tempCwd);

      assert.equal(result.bundlePath, customOutput);
      assert.ok(result.sizeBytes > 0);
      const fileExists = await fs
        .stat(customOutput)
        .then(() => true)
        .catch(() => false);
      assert.ok(fileExists);
    } finally {
      process.chdir(origCwd);
    }
  });

  it('3. handles non-existent or fresh session gracefully with empty defaults', async () => {
    const freshId = 'fresh-unknown-session-109';
    const origCwd = process.cwd();
    try {
      process.chdir(tempCwd);
      const result = await exportSessionBundle(freshId, undefined, tempCwd);

      assert.ok(result.bundlePath);
      assert.ok(result.sizeBytes > 0);
      assert.ok(result.filesIncluded.includes('manifest.json'));
    } finally {
      process.chdir(origCwd);
    }
  });
});
