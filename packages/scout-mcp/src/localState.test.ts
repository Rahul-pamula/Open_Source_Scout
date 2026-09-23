import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getOrCreateLocalSession, processLocalSubmit, processLocalMarkBlocked, getLocalState } from './localState.js';

const LOCAL_STATE_DIR = path.join(process.cwd(), '.scout-tmp');
const LOCAL_STATE_FILE = path.join(LOCAL_STATE_DIR, 'state.json');

test('Local State Logic', async (t) => {
  const cleanup = async () => {
    try {
      await fs.rm(LOCAL_STATE_DIR, { recursive: true, force: true });
    } catch {}
  };

  t.beforeEach(cleanup);
  t.after(cleanup);

  await t.test('getOrCreateLocalSession creates a new session', async () => {
    const id = await getOrCreateLocalSession('sess-1', 'commit-123');
    assert.strictEqual(id, 'sess-1');
    const state = await getLocalState();
    assert.strictEqual(state.sessions['sess-1'].status, 'ACTIVE');
    assert.strictEqual(state.sessions['sess-1'].starting_commit_hash, 'commit-123');
  });

  await t.test('getOrCreateLocalSession returns existing active session if commit matches', async () => {
    await getOrCreateLocalSession('sess-1', 'commit-123');
    const id = await getOrCreateLocalSession('sess-1', 'commit-123');
    assert.strictEqual(id, 'sess-1');
  });

  await t.test('getOrCreateLocalSession throws stale session error if commit mismatches', async () => {
    await getOrCreateLocalSession('sess-1', 'commit-123');
    await assert.rejects(
      () => getOrCreateLocalSession('sess-1', 'commit-456'),
      /Stale session detected/
    );
  });

  await t.test('processLocalSubmit marks active session as submitted', async () => {
    await getOrCreateLocalSession('sess-submit', 'commit-123');
    const res = await processLocalSubmit('sess-submit', 'http://pr');
    assert.strictEqual(res.idempotent, false);
    
    const state = await getLocalState();
    assert.strictEqual(state.sessions['sess-submit'].status, 'SUBMITTED');
    assert.strictEqual(state.sessions['sess-submit'].pr_url, 'http://pr');
  });

  await t.test('processLocalSubmit is idempotent on already submitted', async () => {
    await getOrCreateLocalSession('sess-sub2', 'commit-123');
    await processLocalSubmit('sess-sub2');
    const res = await processLocalSubmit('sess-sub2');
    assert.strictEqual(res.idempotent, true);
  });

  await t.test('processLocalSubmit throws if blocked', async () => {
    await getOrCreateLocalSession('sess-sub3', 'commit-123');
    await processLocalMarkBlocked('sess-sub3', 'reason');
    await assert.rejects(
      () => processLocalSubmit('sess-sub3'),
      /cannot submit a blocked session/
    );
  });

  await t.test('processLocalMarkBlocked marks active session as blocked', async () => {
    await getOrCreateLocalSession('sess-blk', 'commit-123');
    const res = await processLocalMarkBlocked('sess-blk', 'some reason');
    assert.strictEqual(res.idempotent, false);

    const state = await getLocalState();
    assert.strictEqual(state.sessions['sess-blk'].status, 'BLOCKED');
    assert.strictEqual(state.sessions['sess-blk'].blocked_reason, 'some reason');
  });

  await t.test('processLocalMarkBlocked is idempotent on already blocked', async () => {
    await getOrCreateLocalSession('sess-blk2', 'commit-123');
    await processLocalMarkBlocked('sess-blk2', 'reason');
    const res = await processLocalMarkBlocked('sess-blk2', 'reason 2');
    assert.strictEqual(res.idempotent, true);
  });

  await t.test('processLocalMarkBlocked throws if submitted', async () => {
    await getOrCreateLocalSession('sess-blk3', 'commit-123');
    await processLocalSubmit('sess-blk3');
    await assert.rejects(
      () => processLocalMarkBlocked('sess-blk3', 'reason'),
      /cannot block an already submitted session/
    );
  });
});
