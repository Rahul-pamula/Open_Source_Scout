import test from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';

const SubmitForReviewSchema = z.object({
  session_id: z.string().uuid(),
  pr_url: z.string().optional(),
});

const MarkBlockedSchema = z.object({
  session_id: z.string().uuid(),
  reason: z.string(),
});

test('MCP Tools Schema Validation', async (t) => {
  await t.test('submit_for_review accepts valid', () => {
    assert.doesNotThrow(() => SubmitForReviewSchema.parse({ session_id: '123e4567-e89b-12d3-a456-426614174000' }));
  });

  await t.test('submit_for_review rejects invalid', () => {
    assert.throws(() => SubmitForReviewSchema.parse({ session_id: 'invalid-uuid' }));
  });

  await t.test('mark_blocked accepts valid', () => {
    assert.doesNotThrow(() => MarkBlockedSchema.parse({ session_id: '123e4567-e89b-12d3-a456-426614174000', reason: 'blocked' }));
  });

  await t.test('mark_blocked rejects missing reason', () => {
    assert.throws(() => MarkBlockedSchema.parse({ session_id: '123e4567-e89b-12d3-a456-426614174000' }));
  });
});

test('Session Workspaces Hydration', async (t) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const os = await import('node:os');
  const { hydrateSessionWorkspaces, sessionWorkspaces } = await import('./index.js');
  const { saveLocalState } = await import('./localState.js');

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-hydrate-test-'));

  t.after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  await t.test('restores active session workspace mappings on startup', async () => {
    sessionWorkspaces.clear();
    const testState = {
      sessions: {
        'sess-active-1': {
          status: 'ACTIVE' as const,
          starting_commit_hash: 'c1',
          task_description: 'Task 1',
          source: 'manual',
          workspace_path: '/tmp/workspace-1',
        },
        'sess-submitted-1': {
          status: 'SUBMITTED' as const,
          starting_commit_hash: 'c2',
          task_description: 'Task 2',
          source: 'manual',
          workspace_path: '/tmp/workspace-2',
        },
      },
    };
    await saveLocalState(testState, tmpDir);

    const count = await hydrateSessionWorkspaces(tmpDir);
    assert.strictEqual(count, 1);
    assert.strictEqual(sessionWorkspaces.get('sess-active-1'), '/tmp/workspace-1');
    assert.strictEqual(sessionWorkspaces.has('sess-submitted-1'), false);
  });
});
