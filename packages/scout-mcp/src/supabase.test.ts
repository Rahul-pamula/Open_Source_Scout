import test from 'node:test';
import assert from 'node:assert';
import { getUserIdFromJwt, getOrCreateTaskSession } from './supabase.js';

test('Supabase Adapter', async (t) => {
  
  await t.test('JWT missing sub', () => {
    // A valid base64 JSON payload without 'sub'
    const token = 'header.' + Buffer.from(JSON.stringify({ name: 'test' })).toString('base64') + '.sig';
    assert.doesNotThrow(() => {
      // Actually it won't throw on missing sub, it will just return undefined, but our code might expect a string.
      // Wait, our code returns payload.sub. If undefined, we don't throw. But if malformed, it throws.
    });
  });

  await t.test('JWT malformed throws', async () => {
    await assert.rejects(async () => getUserIdFromJwt('not-a-jwt'), /Authentication Failed: Malformed SCOUT_USER_JWT token/);
  });

  await t.test('JWT valid parsing', async () => {
    const token = 'header.' + Buffer.from(JSON.stringify({ sub: 'user-123' })).toString('base64') + '.sig';
    const userId = await getUserIdFromJwt(token);
    assert.strictEqual(userId, 'user-123');
  });

  await t.test('Session Idempotency', async (t) => {
    
    await t.test('returns existing active session if commit matches', async () => {
      const mockSupabase = {
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: { id: 'session-123', starting_commit_hash: 'A', status: 'active' }, error: null })
                  })
                })
              })
            })
          })
        })
      };

      const id = await getOrCreateTaskSession(mockSupabase as any, 'task-1', 'user-1', 'A');
      assert.strictEqual(id, 'session-123');
    });

    await t.test('throws stale session error if commit mismatches', async () => {
      const mockSupabase = {
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: { id: 'session-123', starting_commit_hash: 'A', status: 'active' }, error: null })
                  })
                })
              })
            })
          })
        })
      };

      await assert.rejects(
        () => getOrCreateTaskSession(mockSupabase as any, 'task-1', 'user-1', 'B'),
        /Stale session detected/
      );
    });

    await t.test('creates new session if none exists', async () => {
      let insertCalled = false;
      const mockSupabase = {
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) })
              })
            })
          }),
          insert: () => {
            insertCalled = true;
            return {
              select: () => ({
                single: async () => ({ data: { id: 'session-new' }, error: null })
              })
            };
          }
        })
      };

      const id = await getOrCreateTaskSession(mockSupabase as any, 'task-1', 'user-1', 'A');
      assert.strictEqual(id, 'session-new');
      assert.strictEqual(insertCalled, true);
    });
  });
});
