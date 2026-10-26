import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  getOrCreateLocalSession,
  getLocalState,
  processLocalSubmit,
  processLocalCancel,
  updateLocalHeartbeat,
  flushLocalState,
} from './localState.js';
import { hydrateSessionWorkspaces, sessionWorkspaces } from './index.js';

test('Phase 1 End-to-End Integration Suite', async (t) => {
  let tmpDir: string;

  t.beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-phase1-integration-'));
  });

  t.afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    sessionWorkspaces.clear();
  });

  await t.test('full session execution lifecycle: init -> heartbeat -> submit -> persistence verified', async () => {
    const sessionId = 'phase1-lifecycle-session';
    const workspacePath = path.join(tmpDir, 'worktree-1');
    await fs.mkdir(workspacePath, { recursive: true });

    // 1. Initialize
    const returnedSessionId = await getOrCreateLocalSession(
      sessionId,
      'commit-sha-123',
      'Resolve edge-case in parser',
      'manual',
      'issue-16',
      tmpDir,
      workspacePath,
      'scout-cli',
    );

    assert.strictEqual(returnedSessionId, sessionId);

    let state = await getLocalState(tmpDir);
    assert.strictEqual(state.sessions[sessionId].status, 'ACTIVE');
    assert.strictEqual(state.sessions[sessionId].workspace_path, workspacePath);
    assert.strictEqual(state.sessions[sessionId].client_id, 'scout-cli');

    // 2. Heartbeat
    const hbUpdated = await updateLocalHeartbeat(sessionId, tmpDir);
    assert.strictEqual(hbUpdated, true);

    // 3. Submit for review
    const submitResult = await processLocalSubmit(sessionId, 'https://github.com/org/repo/pull/1', tmpDir);
    assert.strictEqual(submitResult.idempotent, false);

    // 4. Verify disk persistence
    await flushLocalState();
    const diskState = await getLocalState(tmpDir);
    assert.strictEqual(diskState.sessions[sessionId].status, 'SUBMITTED');
    assert.strictEqual(diskState.sessions[sessionId].pr_url, 'https://github.com/org/repo/pull/1');
  });

  await t.test('server failure recovery & memory rehydration', async () => {
    const sessionId = 'phase1-crash-session';
    const workspacePath = path.join(tmpDir, 'worktree-crash');
    await fs.mkdir(workspacePath, { recursive: true });

    await getOrCreateLocalSession(
      sessionId,
      'commit-head-456',
      'Refactor state engine',
      'manual',
      'task-99',
      tmpDir,
      workspacePath,
    );

    // Simulate unexpected server crash / memory wipe
    sessionWorkspaces.clear();
    assert.strictEqual(sessionWorkspaces.size, 0);

    // Server boots up again: hydrate from disk
    const rehydrated = await hydrateSessionWorkspaces(tmpDir);
    assert.strictEqual(rehydrated, 1);
    assert.strictEqual(sessionWorkspaces.get(sessionId), workspacePath);

    // Clean cancellation
    await processLocalCancel(sessionId, tmpDir);
    sessionWorkspaces.delete(sessionId);
    assert.strictEqual(sessionWorkspaces.has(sessionId), false);

    const postCancelState = await getLocalState(tmpDir);
    assert.strictEqual(postCancelState.sessions[sessionId].status, 'CANCELLED');
  });
});
