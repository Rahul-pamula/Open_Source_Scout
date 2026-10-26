import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  getOrCreateLocalSession,
  getLocalState,
  updateSessionWorkspace,
} from './localState.js';
import { hydrateSessionWorkspaces, sessionWorkspaces } from './index.js';

test('Server Reboot State Restoration Integration', async (t) => {
  let tmpDir: string;

  t.beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-reboot-test-'));
  });

  t.afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    sessionWorkspaces.clear();
  });

  await t.test('simulates process termination and verifies complete workspace re-attachment', async () => {
    // 1. Session created before process reboot
    const sessionId = 'reboot-sess-1';
    const originalWorkspace = path.join(tmpDir, 'mock-worktree-path');
    await fs.mkdir(originalWorkspace, { recursive: true });

    await getOrCreateLocalSession(
      sessionId,
      'commit-head-sha',
      'Test task before reboot',
      'manual',
      'task-42',
      tmpDir,
      originalWorkspace,
    );

    // Verify session initially active
    let state = await getLocalState(tmpDir);
    assert.strictEqual(state.sessions[sessionId].status, 'ACTIVE');
    assert.strictEqual(state.sessions[sessionId].workspace_path, originalWorkspace);

    // 2. Simulate process crash / server restart:
    // Memory is wiped
    sessionWorkspaces.clear();
    assert.strictEqual(sessionWorkspaces.size, 0);

    // 3. New server process boots up: hydrate from disk
    const restoredCount = await hydrateSessionWorkspaces(tmpDir);
    assert.strictEqual(restoredCount, 1);
    assert.strictEqual(sessionWorkspaces.get(sessionId), originalWorkspace);

    // 4. Update session workspace post-reboot
    const updatedWorkspace = path.join(tmpDir, 'new-worktree-path');
    await updateSessionWorkspace(sessionId, updatedWorkspace, tmpDir);

    state = await getLocalState(tmpDir);
    assert.strictEqual(state.sessions[sessionId].workspace_path, updatedWorkspace);
  });
});
