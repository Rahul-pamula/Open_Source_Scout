import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  getOrCreateLocalSession,
  processLocalSubmit,
  processLocalMarkBlocked,
  getLocalState,
  updateLocalHeartbeat,
  checkStaleSessions,
  findStaleSession,
  DEFAULT_STALE_TIMEOUT_MS,
} from './localState.js';

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/** Create an isolated temp directory for each sub-test to avoid cross-test state. */
async function makeTmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'scout-ls-test-'));
}

async function cleanDir(dir: string) {
  await fs.rm(dir, { recursive: true, force: true });
}

// --------------------------------------------------------------------------
// Legacy state-machine tests (preserved from original test file)
// --------------------------------------------------------------------------

test('Local State Logic', async (t) => {
  let tmpDir: string;

  t.beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  t.afterEach(async () => {
    await cleanDir(tmpDir);
  });

  await t.test('getOrCreateLocalSession creates a new session', async () => {
    const id = await getOrCreateLocalSession('sess-1', 'commit-123', 'Task 1', 'manual', undefined, tmpDir);
    assert.strictEqual(id, 'sess-1');
    const state = await getLocalState(tmpDir);
    assert.strictEqual(state.sessions['sess-1'].status, 'ACTIVE');
    assert.strictEqual(state.sessions['sess-1'].starting_commit_hash, 'commit-123');
    assert.strictEqual(state.sessions['sess-1'].task_description, 'Task 1');
    assert.strictEqual(state.sessions['sess-1'].source, 'manual');
  });

  await t.test('getOrCreateLocalSession sets initial heartbeat on creation', async () => {
    const before = new Date();
    await getOrCreateLocalSession('sess-hb-init', 'commit-abc', 'Task', 'manual', undefined, tmpDir);
    const after = new Date();
    const state = await getLocalState(tmpDir);
    const hb = new Date(state.sessions['sess-hb-init'].last_heartbeat_at!);
    assert.ok(hb >= before, 'heartbeat should be >= before');
    assert.ok(hb <= after, 'heartbeat should be <= after');
  });

  await t.test('getOrCreateLocalSession returns existing active session if commit matches', async () => {
    await getOrCreateLocalSession('sess-1', 'commit-123', 'Task 1', 'manual', undefined, tmpDir);
    const id = await getOrCreateLocalSession('sess-1', 'commit-123', 'Task 1', 'manual', undefined, tmpDir);
    assert.strictEqual(id, 'sess-1');
  });

  await t.test('getOrCreateLocalSession throws stale session error if commit mismatches', async () => {
    await getOrCreateLocalSession('sess-1', 'commit-123', 'Task 1', 'manual', undefined, tmpDir);
    await assert.rejects(
      () => getOrCreateLocalSession('sess-1', 'commit-456', 'Task 1', 'manual', undefined, tmpDir),
      /Stale session detected/
    );
  });

  await t.test('getOrCreateLocalSession throws if session is STALE status', async () => {
    await getOrCreateLocalSession('sess-stale', 'commit-123', 'Task 1', 'manual', undefined, tmpDir);
    // Force session into STALE by running checkStaleSessions with a 0 ms timeout
    await checkStaleSessions(0, tmpDir);
    await assert.rejects(
      () => getOrCreateLocalSession('sess-stale', 'commit-123', 'Task 1', 'manual', undefined, tmpDir),
      /STALE/
    );
  });

  await t.test('processLocalSubmit marks active session as submitted', async () => {
    await getOrCreateLocalSession('sess-submit', 'commit-123', 'Task 1', 'manual', undefined, tmpDir);
    const res = await processLocalSubmit('sess-submit', 'http://pr', tmpDir);
    assert.strictEqual(res.idempotent, false);

    const state = await getLocalState(tmpDir);
    assert.strictEqual(state.sessions['sess-submit'].status, 'SUBMITTED');
    assert.strictEqual(state.sessions['sess-submit'].pr_url, 'http://pr');
  });

  await t.test('processLocalSubmit is idempotent on already submitted', async () => {
    await getOrCreateLocalSession('sess-sub2', 'commit-123', 'Task 1', 'manual', undefined, tmpDir);
    await processLocalSubmit('sess-sub2', undefined, tmpDir);
    const res = await processLocalSubmit('sess-sub2', undefined, tmpDir);
    assert.strictEqual(res.idempotent, true);
  });

  await t.test('processLocalSubmit throws if blocked', async () => {
    await getOrCreateLocalSession('sess-sub3', 'commit-123', 'Task 1', 'manual', undefined, tmpDir);
    await processLocalMarkBlocked('sess-sub3', 'reason', tmpDir);
    await assert.rejects(
      () => processLocalSubmit('sess-sub3', undefined, tmpDir),
      /cannot submit a blocked session/
    );
  });

  await t.test('processLocalMarkBlocked marks active session as blocked', async () => {
    await getOrCreateLocalSession('sess-blk', 'commit-123', 'Task 1', 'manual', undefined, tmpDir);
    const res = await processLocalMarkBlocked('sess-blk', 'some reason', tmpDir);
    assert.strictEqual(res.idempotent, false);

    const state = await getLocalState(tmpDir);
    assert.strictEqual(state.sessions['sess-blk'].status, 'BLOCKED');
    assert.strictEqual(state.sessions['sess-blk'].blocked_reason, 'some reason');
  });

  await t.test('processLocalMarkBlocked is idempotent on already blocked', async () => {
    await getOrCreateLocalSession('sess-blk2', 'commit-123', 'Task 1', 'manual', undefined, tmpDir);
    await processLocalMarkBlocked('sess-blk2', 'reason', tmpDir);
    const res = await processLocalMarkBlocked('sess-blk2', 'reason 2', tmpDir);
    assert.strictEqual(res.idempotent, true);
  });

  await t.test('processLocalMarkBlocked throws if submitted', async () => {
    await getOrCreateLocalSession('sess-blk3', 'commit-123', 'Task 1', 'manual', undefined, tmpDir);
    await processLocalSubmit('sess-blk3', undefined, tmpDir);
    await assert.rejects(
      () => processLocalMarkBlocked('sess-blk3', 'reason', tmpDir),
      /cannot block an already submitted session/
    );
  });
});

// --------------------------------------------------------------------------
// Heartbeat tests
// --------------------------------------------------------------------------

test('Heartbeat', async (t) => {
  let tmpDir: string;

  t.beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  t.afterEach(async () => {
    await cleanDir(tmpDir);
  });

  await t.test('updateLocalHeartbeat updates last_heartbeat_at', async () => {
    await getOrCreateLocalSession('sess-hb', 'commit-1', 'Task', 'manual', undefined, tmpDir);

    const before = new Date();
    const found = await updateLocalHeartbeat('sess-hb', tmpDir);
    const after = new Date();

    assert.strictEqual(found, true);
    const state = await getLocalState(tmpDir);
    const hb = new Date(state.sessions['sess-hb'].last_heartbeat_at!);
    assert.ok(hb >= before, 'heartbeat should be >= before timestamp');
    assert.ok(hb <= after, 'heartbeat should be <= after timestamp');
  });

  await t.test('updateLocalHeartbeat returns false for unknown session', async () => {
    const found = await updateLocalHeartbeat('nonexistent-session', tmpDir);
    assert.strictEqual(found, false);
  });

  await t.test('updateLocalHeartbeat updates an existing heartbeat to a newer time', async () => {
    await getOrCreateLocalSession('sess-hb2', 'commit-1', 'Task', 'manual', undefined, tmpDir);

    // First heartbeat
    await updateLocalHeartbeat('sess-hb2', tmpDir);
    const state1 = await getLocalState(tmpDir);
    const first = state1.sessions['sess-hb2'].last_heartbeat_at!;

    // Small sleep to ensure timestamps differ
    await new Promise(r => setTimeout(r, 10));

    // Second heartbeat
    await updateLocalHeartbeat('sess-hb2', tmpDir);
    const state2 = await getLocalState(tmpDir);
    const second = state2.sessions['sess-hb2'].last_heartbeat_at!;

    assert.ok(new Date(second) > new Date(first), 'second heartbeat should be newer');
  });
});

// --------------------------------------------------------------------------
// Stale detection tests
// --------------------------------------------------------------------------

test('Stale Session Detection', async (t) => {
  let tmpDir: string;

  t.beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  t.afterEach(async () => {
    await cleanDir(tmpDir);
  });

  await t.test('checkStaleSessions marks ACTIVE session as STALE when timeout exceeded', async () => {
    await getOrCreateLocalSession('sess-active', 'commit-1', 'Task', 'manual', undefined, tmpDir);
    // Use 0 ms timeout — any session without a very-recent heartbeat is stale
    const count = await checkStaleSessions(0, tmpDir);
    assert.strictEqual(count, 1);
    const state = await getLocalState(tmpDir);
    assert.strictEqual(state.sessions['sess-active'].status, 'STALE');
  });

  await t.test('checkStaleSessions does not mark recently-heartbeated session as STALE', async () => {
    await getOrCreateLocalSession('sess-fresh', 'commit-1', 'Task', 'manual', undefined, tmpDir);
    // Update heartbeat so it's just now
    await updateLocalHeartbeat('sess-fresh', tmpDir);
    // Run with the full 30-minute timeout — the session should NOT be stale
    const count = await checkStaleSessions(DEFAULT_STALE_TIMEOUT_MS, tmpDir);
    assert.strictEqual(count, 0);
    const state = await getLocalState(tmpDir);
    assert.strictEqual(state.sessions['sess-fresh'].status, 'ACTIVE');
  });

  await t.test('checkStaleSessions treats session with no heartbeat as stale immediately', async () => {
    // Manually insert a session without a heartbeat
    const { saveLocalState } = await import('./localState.js');
    await saveLocalState({
      sessions: {
        'sess-no-hb': {
          status: 'ACTIVE',
          starting_commit_hash: 'commit-2',
          task_description: 'No heartbeat task',
          source: 'manual',
          // last_heartbeat_at intentionally absent
        },
      },
    }, tmpDir);

    const count = await checkStaleSessions(DEFAULT_STALE_TIMEOUT_MS, tmpDir);
    assert.strictEqual(count, 1);
    const state = await getLocalState(tmpDir);
    assert.strictEqual(state.sessions['sess-no-hb'].status, 'STALE');
  });

  await t.test('checkStaleSessions does not affect SUBMITTED sessions', async () => {
    await getOrCreateLocalSession('sess-sub', 'commit-1', 'Task', 'manual', undefined, tmpDir);
    await processLocalSubmit('sess-sub', undefined, tmpDir);
    const count = await checkStaleSessions(0, tmpDir);
    assert.strictEqual(count, 0);
    const state = await getLocalState(tmpDir);
    assert.strictEqual(state.sessions['sess-sub'].status, 'SUBMITTED');
  });

  await t.test('checkStaleSessions does not affect BLOCKED sessions', async () => {
    await getOrCreateLocalSession('sess-blk', 'commit-1', 'Task', 'manual', undefined, tmpDir);
    await processLocalMarkBlocked('sess-blk', 'some reason', tmpDir);
    const count = await checkStaleSessions(0, tmpDir);
    assert.strictEqual(count, 0);
    const state = await getLocalState(tmpDir);
    assert.strictEqual(state.sessions['sess-blk'].status, 'BLOCKED');
  });

  await t.test('checkStaleSessions returns 0 and does not write when nothing changes', async () => {
    await getOrCreateLocalSession('sess-fine', 'commit-1', 'Task', 'manual', undefined, tmpDir);
    await updateLocalHeartbeat('sess-fine', tmpDir);
    const count = await checkStaleSessions(DEFAULT_STALE_TIMEOUT_MS, tmpDir);
    assert.strictEqual(count, 0);
  });

  await t.test('checkStaleSessions marks multiple stale sessions', async () => {
    await getOrCreateLocalSession('sess-a', 'commit-1', 'Task A', 'manual', undefined, tmpDir);
    await getOrCreateLocalSession('sess-b', 'commit-2', 'Task B', 'manual', undefined, tmpDir);
    const count = await checkStaleSessions(0, tmpDir);
    assert.strictEqual(count, 2);
    const state = await getLocalState(tmpDir);
    assert.strictEqual(state.sessions['sess-a'].status, 'STALE');
    assert.strictEqual(state.sessions['sess-b'].status, 'STALE');
  });
});

// --------------------------------------------------------------------------
// Stale recovery tests (initialize_execution pattern)
// --------------------------------------------------------------------------

test('Recovery from Stale Sessions', async (t) => {
  let tmpDir: string;

  t.beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  t.afterEach(async () => {
    await cleanDir(tmpDir);
  });

  await t.test('findStaleSession returns null when no stale sessions exist', async () => {
    const id = await findStaleSession(tmpDir);
    assert.strictEqual(id, null);
  });

  await t.test('findStaleSession returns null when only ACTIVE sessions exist', async () => {
    await getOrCreateLocalSession('sess-live', 'commit-1', 'Task', 'manual', undefined, tmpDir);
    const id = await findStaleSession(tmpDir);
    assert.strictEqual(id, null);
  });

  await t.test('findStaleSession returns stale session id after checkStaleSessions', async () => {
    await getOrCreateLocalSession('sess-crashed', 'commit-1', 'Task', 'manual', undefined, tmpDir);
    await checkStaleSessions(0, tmpDir);
    const id = await findStaleSession(tmpDir);
    assert.strictEqual(id, 'sess-crashed');
  });

  await t.test('new session can be created after existing stale session (recovery pattern)', async () => {
    // Simulate a session that was created and then became stale (process crash)
    await getOrCreateLocalSession('sess-old', 'commit-1', 'Old Task', 'manual', undefined, tmpDir);
    await checkStaleSessions(0, tmpDir);

    // Confirm old session is stale
    const staleId = await findStaleSession(tmpDir);
    assert.strictEqual(staleId, 'sess-old');

    // Now create a fresh session with a new ID (mimicking initialize_execution recovery)
    const newId = await getOrCreateLocalSession('sess-new', 'commit-1', 'New Task', 'manual', undefined, tmpDir);
    assert.strictEqual(newId, 'sess-new');

    const state = await getLocalState(tmpDir);
    assert.strictEqual(state.sessions['sess-new'].status, 'ACTIVE');
    assert.strictEqual(state.sessions['sess-old'].status, 'STALE');
  });

  await t.test('stale session cannot be reused via getOrCreateLocalSession', async () => {
    await getOrCreateLocalSession('sess-crash2', 'commit-1', 'Task', 'manual', undefined, tmpDir);
    await checkStaleSessions(0, tmpDir);

    await assert.rejects(
      () => getOrCreateLocalSession('sess-crash2', 'commit-1', 'Task', 'manual', undefined, tmpDir),
      /STALE/
    );
  });

  await t.test('findStaleSession ignores SUBMITTED sessions', async () => {
    await getOrCreateLocalSession('sess-sub', 'commit-1', 'Task', 'manual', undefined, tmpDir);
    await processLocalSubmit('sess-sub', undefined, tmpDir);
    // Even after running stale check, SUBMITTED should not be picked up
    await checkStaleSessions(0, tmpDir);
    const id = await findStaleSession(tmpDir);
    assert.strictEqual(id, null);
  });

  await t.test('findStaleSession ignores BLOCKED sessions', async () => {
    await getOrCreateLocalSession('sess-blk', 'commit-1', 'Task', 'manual', undefined, tmpDir);
    await processLocalMarkBlocked('sess-blk', 'reason', tmpDir);
    await checkStaleSessions(0, tmpDir);
    const id = await findStaleSession(tmpDir);
    assert.strictEqual(id, null);
  });
});
