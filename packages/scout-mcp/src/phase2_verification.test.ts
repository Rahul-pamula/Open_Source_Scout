/**
 * Full behavioral test matrix for Phase 2 verification.
 * 
 * Coverage:
 *   1. Authentication (JWT) — fully local
 *   2. Session logic — mocked Supabase client
 *   3. Git adapter — isolated temp-dir git repos
 *   4. Skills loader — temp-dir filesystem
 *   5. submit_for_review / mark_blocked — mocked Supabase client
 *   6. Advisory validation — real process spawn
 *   7. Database concurrent-session invariant — mocked (DB unavailable)
 *
 * For tests that require a live Supabase instance (RLS isolation, wrong-user
 * rejection), those sections are marked SKIPPED with an explicit reason.
 */
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

import { getUserIdFromJwt, getOrCreateTaskSession, updateSessionStatus, getSessionStatus, checkSubmitIdempotency, processMarkBlocked } from './supabase.js';
import { getGitInfo, checkDirtyWorkingTree } from './git.js';
import { loadSkills } from './skills.js';
import { runAdvisoryValidation } from './validation.js';

// ─── helpers ───────────────────────────────────────────────────────────────

function makeJwt(payload: Record<string, unknown>): string {
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `header.${b64}.sig`;
}

/** Minimal Supabase mock – call only the methods the unit-under-test actually uses. */
function mockSelect(rows: Record<string, unknown> | null) {
  const chain: any = {
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => ({ data: rows, error: null }),
    single: async () => ({ data: rows, error: null }),
  };
  return () => chain;
}

function mockInsert(result: { data: Record<string, unknown> | null; error: any }) {
  return () => ({
    select: () => ({
      single: async () => result,
    }),
  });
}

function mockUpdate(error: any = null) {
  return () => ({
    eq: () => ({ error }),
  });
}

// ─── 1. AUTHENTICATION ─────────────────────────────────────────────────────

test('1. Authentication — getUserIdFromJwt', async (t) => {
  await t.test('1a missing JWT (empty string)', async () => {
    await assert.rejects(
      () => getUserIdFromJwt(''),
      /Authentication Failed: Malformed SCOUT_USER_JWT token/
    );
  });

  await t.test('1b malformed JWT (not three parts)', async () => {
    await assert.rejects(
      () => getUserIdFromJwt('not-a-jwt'),
      /Authentication Failed: Malformed SCOUT_USER_JWT token/
    );
  });

  await t.test('1c malformed JWT (invalid base64 payload)', async () => {
    await assert.rejects(
      () => getUserIdFromJwt('header.!!!.sig'),
      /Authentication Failed: Malformed SCOUT_USER_JWT token/
    );
  });

  await t.test('1d valid JWT extracts sub as user-id', async () => {
    const token = makeJwt({ sub: 'user-abc-123' });
    const userId = await getUserIdFromJwt(token);
    assert.strictEqual(userId, 'user-abc-123');
  });

  await t.test('1e JWT missing sub — rejects Authentication Failed', async () => {
    const token = makeJwt({ name: 'no-sub-field' });
    await assert.rejects(
      () => getUserIdFromJwt(token),
      /Authentication Failed: SCOUT_USER_JWT has no sub claim/
    );
  });

  // RLS isolation: requires live Supabase.
  await t.test('1f wrong-user RLS rejection — SKIPPED: environment unavailable', () => {
    // Not executed — Supabase environment unavailable.
    // This path is enforced by Supabase RLS, not by application code.
  });
});

// ─── 2. SESSION LOGIC ──────────────────────────────────────────────────────

test('2. Session logic — getOrCreateTaskSession (mocked Supabase)', async (t) => {
  await t.test('2a first blueprint — no existing session → INSERT called', async () => {
    let insertCalled = false;
    const supabase = {
      from: () => ({
        select: mockSelect(null),
        insert: () => {
          insertCalled = true;
          return mockInsert({ data: { id: 'session-new' }, error: null })();
        },
      }),
    };
    const id = await getOrCreateTaskSession(supabase as any, 'task-1', 'user-1', 'deadbeef');
    assert.strictEqual(id, 'session-new');
    assert.ok(insertCalled, 'INSERT must have been called');
  });

  await t.test('2b repeated blueprint — same commit → returns existing, no INSERT', async () => {
    let insertCalled = false;
    const existing = { id: 'session-existing', starting_commit_hash: 'deadbeef', status: 'ACTIVE' };
    const supabase = {
      from: () => ({
        select: mockSelect(existing),
        insert: () => { insertCalled = true; return mockInsert({ data: null, error: null })(); },
      }),
    };
    const id = await getOrCreateTaskSession(supabase as any, 'task-1', 'user-1', 'deadbeef');
    assert.strictEqual(id, 'session-existing');
    assert.strictEqual(insertCalled, false, 'INSERT must NOT have been called');
  });

  await t.test('2c active session, same commit — explicitly reusable', async () => {
    const existing = { id: 'session-reuse', starting_commit_hash: 'abc123', status: 'ACTIVE' };
    const supabase = { from: () => ({ select: mockSelect(existing) }) };
    const id = await getOrCreateTaskSession(supabase as any, 'task-1', 'user-1', 'abc123');
    assert.strictEqual(id, 'session-reuse');
  });

  await t.test('2d active session, DIFFERENT commit — deterministic stale-session error', async () => {
    const existing = { id: 'session-stale', starting_commit_hash: 'old-commit', status: 'ACTIVE' };
    const supabase = { from: () => ({ select: mockSelect(existing) }) };
    await assert.rejects(
      () => getOrCreateTaskSession(supabase as any, 'task-1', 'user-1', 'new-commit'),
      /Stale session detected.*old-commit.*new-commit/
    );
  });

  await t.test('2e concurrent INSERT — unique-index violation (23505) → retry SELECT returns winner', async () => {
    let insertCalled = false;
    const winner = { id: 'session-winner', starting_commit_hash: 'deadbeef', status: 'ACTIVE' };

    // First SELECT returns null → we try to INSERT → DB rejects with 23505
    // → code retries SELECT → returns the concurrently-created session
    const supabase = {
      from: () => {
        let selectCallCount = 0;
        return {
          select: () => {
            const chain: any = {
              eq: () => chain,
              order: () => chain,
              limit: () => chain,
              maybeSingle: async () => {
                selectCallCount++;
                if (selectCallCount === 1) return { data: null, error: null };  // first SELECT: empty
                return { data: winner, error: null }; // retry SELECT: concurrently-created session
              },
              single: async () => ({ data: winner, error: null }),
            };
            return chain;
          },
          insert: () => {
            insertCalled = true;
            return {
              select: () => ({
                single: async () => ({ data: null, error: { code: '23505', message: 'unique violation' } }),
              }),
            };
          },
        };
      },
    };

    const id = await getOrCreateTaskSession(supabase as any, 'task-1', 'user-1', 'deadbeef');
    assert.ok(insertCalled, 'INSERT should have been attempted');
    assert.strictEqual(id, 'session-winner');
  });

  await t.test('2f wrong-user session access — SKIPPED: environment unavailable', () => {
    // Not executed — Supabase RLS prevents cross-user access.
    // Application code does not attempt to enforce this; enforcement is in the DB.
  });

  await t.test('2g get_task_blueprint rejects an already SUBMITTED task', async () => {
    const existing = { id: 'session-sub', starting_commit_hash: 'abc123', status: 'SUBMITTED' };
    const supabase = { from: () => ({ select: mockSelect(existing) }) };
    await assert.rejects(
      () => getOrCreateTaskSession(supabase as any, 'task-1', 'user-1', 'abc123'),
      /Task is already submitted \/ awaiting external review/
    );
  });

  await t.test('2h get_task_blueprint recovers from BLOCKED task (Option A)', async () => {
    const existing = { id: 'session-blk', starting_commit_hash: 'abc123', status: 'BLOCKED' };
    let insertCalled = false;
    const supabase = {
      from: () => ({
        select: mockSelect(existing),
        insert: () => { insertCalled = true; return mockInsert({ data: { id: 'session-new' }, error: null })(); },
      })
    };
    const id = await getOrCreateTaskSession(supabase as any, 'task-1', 'user-1', 'abc123');
    assert.strictEqual(id, 'session-new');
    assert.strictEqual(insertCalled, true);
  });
  
  await t.test('2i get_task_blueprint does not create a second ACTIVE session (reuses)', async () => {
    let insertCalled = false;
    const existing = { id: 'session-act', starting_commit_hash: 'abc123', status: 'ACTIVE' };
    const supabase = {
      from: () => ({
        select: mockSelect(existing),
        insert: () => { insertCalled = true; return mockInsert({ data: null, error: null })(); },
      })
    };
    const id = await getOrCreateTaskSession(supabase as any, 'task-1', 'user-1', 'abc123');
    assert.strictEqual(id, 'session-act');
    assert.strictEqual(insertCalled, false);
  });
});

// ─── 3. GIT ADAPTER ────────────────────────────────────────────────────────

test('3. Git Adapter — getGitInfo / checkDirtyWorkingTree', async (t) => {
  const testDir = path.join(process.cwd(), '.test-scout-git-matrix');

  const setup = () => fs.mkdirSync(testDir, { recursive: true });
  const teardown = () => fs.rmSync(testDir, { recursive: true, force: true });

  await t.test('3a missing repository — rejects with "Not a git repository"', async () => {
    setup();
    const savedCeil = process.env.GIT_CEILING_DIRECTORIES;
    process.env.GIT_CEILING_DIRECTORIES = path.dirname(testDir);
    try {
      await assert.rejects(() => getGitInfo(testDir), /Not a git repository/);
    } finally {
      process.env.GIT_CEILING_DIRECTORIES = savedCeil;
      teardown();
    }
  });

  await t.test('3b missing origin — rejects with "Git error"', async () => {
    setup();
    execSync('git init', { cwd: testDir });
    try {
      await assert.rejects(() => getGitInfo(testDir), /Git error:/);
    } finally {
      teardown();
    }
  });

  await t.test('3c detached HEAD — rejects with "Detached HEAD state"', async () => {
    setup();
    execSync('git init', { cwd: testDir });
    execSync('git remote add origin https://github.com/test/repo', { cwd: testDir });
    execSync('git commit --allow-empty -m "init"', { cwd: testDir });
    execSync('git checkout --detach HEAD', { cwd: testDir });
    try {
      await assert.rejects(() => getGitInfo(testDir), /Detached HEAD state/);
    } finally {
      teardown();
    }
  });

  await t.test('3d valid clean repo — resolves with remoteUrl, branch, commitHash', async () => {
    setup();
    execSync('git init', { cwd: testDir });
    execSync('git remote add origin git@github.com:test/myrepo.git', { cwd: testDir });
    execSync('git checkout -b main', { cwd: testDir });
    execSync('git commit --allow-empty -m "init"', { cwd: testDir });
    try {
      const info = await getGitInfo(testDir);
      assert.strictEqual(info.remoteUrl, 'https://github.com/test/myrepo');
      assert.strictEqual(info.branch, 'main');
      assert.match(info.commitHash, /^[0-9a-f]{40}$/);
    } finally {
      teardown();
    }
  });

  await t.test('3e clean working tree — resolves without error', async () => {
    setup();
    execSync('git init', { cwd: testDir });
    try {
      await assert.doesNotReject(() => checkDirtyWorkingTree(testDir));
    } finally {
      teardown();
    }
  });

  await t.test('3f untracked file — rejects with "Working tree is dirty"', async () => {
    setup();
    execSync('git init', { cwd: testDir });
    fs.writeFileSync(path.join(testDir, 'untracked.txt'), 'new file');
    try {
      await assert.rejects(() => checkDirtyWorkingTree(testDir), /Working tree is dirty/);
    } finally {
      teardown();
    }
  });

  await t.test('3g modified tracked file — rejects with "Working tree is dirty"', async () => {
    setup();
    execSync('git init', { cwd: testDir });
    const filePath = path.join(testDir, 'tracked.txt');
    fs.writeFileSync(filePath, 'original');
    execSync('git add .', { cwd: testDir });
    execSync('git commit --allow-empty -m "add file"', { cwd: testDir });
    fs.writeFileSync(filePath, 'modified');
    try {
      await assert.rejects(() => checkDirtyWorkingTree(testDir), /Working tree is dirty/);
    } finally {
      teardown();
    }
  });
});

// ─── 4. SKILLS LOADER ──────────────────────────────────────────────────────

test('4. Skills Loader — loadSkills', async (t) => {
  const testDir = path.join(process.cwd(), '.test-scout-skills-matrix');
  const skillsDir = path.join(testDir, '.scout', 'skills');

  const setup = () => fs.mkdirSync(skillsDir, { recursive: true });
  const teardown = () => fs.rmSync(testDir, { recursive: true, force: true });

  await t.test('4a valid skill — loads name, description, content', () => {
    setup();
    fs.writeFileSync(path.join(skillsDir, 'valid.md'), '---\nname: MySkill\ndescription: Describe it\n---\n# Body');
    try {
      const skills = loadSkills(testDir);
      assert.strictEqual(skills.length, 1);
      assert.strictEqual(skills[0].name, 'MySkill');
      assert.strictEqual(skills[0].description, 'Describe it');
      assert.match(skills[0].content, /# Body/);
    } finally {
      teardown();
    }
  });

  await t.test('4b missing name — throws "Missing required frontmatter"', () => {
    setup();
    fs.writeFileSync(path.join(skillsDir, 'no-name.md'), '---\ndescription: Only desc\n---\n# Body');
    try {
      assert.throws(() => loadSkills(testDir), /Missing required frontmatter/);
    } finally {
      teardown();
    }
  });

  await t.test('4c missing description — throws "Missing required frontmatter"', () => {
    setup();
    fs.writeFileSync(path.join(skillsDir, 'no-desc.md'), '---\nname: OnlyName\n---\n# Body');
    try {
      assert.throws(() => loadSkills(testDir), /Missing required frontmatter/);
    } finally {
      teardown();
    }
  });

  await t.test('4d malformed YAML frontmatter — throws "Failed to parse skill file" with filename', () => {
    setup();
    fs.writeFileSync(path.join(skillsDir, 'bad.md'), '---\nname: [unclosed\ndescription: d\n---\n# Body');
    try {
      assert.throws(() => loadSkills(testDir), /Failed to parse skill file bad\.md/);
    } finally {
      teardown();
    }
  });
});

// ─── 5. SUBMIT FOR REVIEW ──────────────────────────────────────────────────

test('5. submit_for_review — checkSubmitIdempotency and updateSessionStatus (mocked)', async (t) => {
  await t.test('5a ACTIVE → SUBMITTED — checkSubmitIdempotency returns false', async () => {
    const supabase = {
      from: () => ({
        select: mockSelect({ status: 'ACTIVE' })
      }),
    };
    const isIdempotent = await checkSubmitIdempotency(supabase as any, 'session-abc', 'user-1');
    assert.strictEqual(isIdempotent, false);
  });

  await t.test('5b SUBMITTED → SUBMITTED — idempotent', async () => {
    const supabase = {
      from: () => ({
        select: mockSelect({ status: 'SUBMITTED' })
      }),
    };
    const isIdempotent = await checkSubmitIdempotency(supabase as any, 'session-abc', 'user-1');
    assert.strictEqual(isIdempotent, true);
  });

  await t.test('5c BLOCKED → SUBMITTED rejection', async () => {
    const supabase = {
      from: () => ({
        select: mockSelect({ status: 'BLOCKED' })
      }),
    };
    await assert.rejects(
      () => checkSubmitIdempotency(supabase as any, 'session-abc', 'user-1'),
      /State transition rejected: cannot submit a blocked session/
    );
  });

  await t.test('5d optimistic concurrency prevents stale ACTIVE state from overwriting a newer state', async () => {
    const supabase = {
      from: () => ({
        update: () => {
          const chain: any = {
            eq: () => chain,
            select: async () => ({ data: [], error: null }) // 0 rows affected
          };
          return chain;
        },
      }),
    };
    await assert.rejects(
      () => updateSessionStatus(supabase as any, 'session-abc', 'user-1', 'SUBMITTED', 'ACTIVE'),
      /State transition rejected: session not found, wrong user, or state changed concurrently/
    );
  });

  await t.test('5e pr_url persistence when provided', async () => {
    let tasksUpdated = false;
    let tasksPrUrl = '';
    const supabase = {
      from: (table: string) => {
        if (table === 'task_sessions') {
          return {
            update: () => {
              const chain: any = {
                eq: () => chain,
                select: async () => ({ data: [{ id: 'session-abc', task_id: 'task-123' }], error: null })
              };
              return chain;
            }
          };
        }
        if (table === 'tasks') {
          return {
            update: (fields: any) => {
              tasksUpdated = true;
              tasksPrUrl = fields.pr_url;
              const chain: any = { eq: () => chain };
              return chain;
            }
          };
        }
      }
    };
    await updateSessionStatus(supabase as any, 'session-abc', 'user-1', 'SUBMITTED', 'ACTIVE', 'https://github.com/pr/1');
    assert.strictEqual(tasksUpdated, true);
    assert.strictEqual(tasksPrUrl, 'https://github.com/pr/1');
  });
});

// ─── 6. MARK BLOCKED ───────────────────────────────────────────────────────

test('6. mark_blocked — processMarkBlocked (mocked)', async (t) => {
  await t.test('6a ACTIVE → BLOCKED — valid block', async () => {
    let updateCalled = false;
    let expectedOldStatusChecked = '';
    const supabase = {
      from: () => ({
        select: mockSelect({ status: 'ACTIVE' }),
        update: (fields: Record<string, string>) => {
          updateCalled = true;
          const chain: any = {
            eq: (k: string, v: string) => {
              if (k === 'status') expectedOldStatusChecked = v;
              return chain;
            },
            select: async () => ({ data: [{ id: 'session-xyz' }], error: null })
          };
          return chain;
        },
      }),
    };
    const { idempotent } = await processMarkBlocked(supabase as any, 'session-xyz', 'user-1');
    assert.strictEqual(idempotent, false);
    assert.strictEqual(updateCalled, true);
    assert.strictEqual(expectedOldStatusChecked, 'ACTIVE');
  });

  await t.test('6b BLOCKED → BLOCKED — idempotent', async () => {
    let updateCalled = false;
    const supabase = {
      from: () => ({
        select: mockSelect({ status: 'BLOCKED' }),
        update: () => { updateCalled = true; return {}; }
      }),
    };
    const { idempotent } = await processMarkBlocked(supabase as any, 'session-xyz', 'user-1');
    assert.strictEqual(idempotent, true);
    assert.strictEqual(updateCalled, false);
  });

  await t.test('6c SUBMITTED → BLOCKED rejection', async () => {
    const supabase = {
      from: () => ({
        select: mockSelect({ status: 'SUBMITTED' })
      }),
    };
    await assert.rejects(
      () => processMarkBlocked(supabase as any, 'session-xyz', 'user-1'),
      /State transition rejected: cannot block an already submitted session/
    );
  });
});

// ─── 7. ADVISORY VALIDATION ────────────────────────────────────────────────

test('7. Advisory Validation — runAdvisoryValidation', async (t) => {
  const testDir = path.join(process.cwd(), '.test-scout-val-matrix');

  const setup = () => fs.mkdirSync(testDir, { recursive: true });
  const teardown = () => fs.rmSync(testDir, { recursive: true, force: true });

  await t.test('7a no package.json — skips, validation_passed:true', async () => {
    setup();
    try {
      const result = await runAdvisoryValidation(testDir);
      assert.strictEqual(result.validation_ran, false);
      assert.strictEqual(result.validation_passed, true);
      assert.strictEqual(result.exit_code, null);
      assert.match(result.stdout, /No scout:validate script found/);
    } finally {
      teardown();
    }
  });

  await t.test('7b package.json without scout:validate — skips, validation_passed:true', async () => {
    setup();
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({ scripts: { test: 'jest' } }));
    try {
      const result = await runAdvisoryValidation(testDir);
      assert.strictEqual(result.validation_ran, false);
      assert.strictEqual(result.validation_passed, true);
      assert.strictEqual(result.exit_code, null);
      assert.match(result.stdout, /No scout:validate script found/);
    } finally {
      teardown();
    }
  });

  await t.test('7c configured scout:validate exits 0 — passes, stdout captured', async () => {
    setup();
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
      scripts: { 'scout:validate': 'echo "VALIDATION_OK"' }
    }));
    try {
      const result = await runAdvisoryValidation(testDir);
      assert.strictEqual(result.validation_ran, true);
      assert.strictEqual(result.validation_passed, true);
      assert.strictEqual(result.exit_code, 0);
      assert.match(result.stdout, /VALIDATION_OK/);
    } finally {
      teardown();
    }
  });

  await t.test('7d configured scout:validate exits 1 — fails (advisory), stdout/stderr captured', async () => {
    setup();
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
      scripts: { 'scout:validate': 'echo "VALIDATION_ERR" >&2 && exit 1' }
    }));
    try {
      const result = await runAdvisoryValidation(testDir);
      assert.strictEqual(result.validation_ran, true);
      assert.strictEqual(result.validation_passed, false);
      assert.strictEqual(result.exit_code, 1);
      // advisory: still returns a result, does not throw
    } finally {
      teardown();
    }
  });

  await t.test('7e validation execution failure — fails (advisory), recovers without crash', async () => {
    setup();
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
      scripts: { 'scout:validate': 'command_does_not_exist_12345' }
    }));
    try {
      const result = await runAdvisoryValidation(testDir);
      assert.strictEqual(result.validation_ran, true);
      assert.strictEqual(result.validation_passed, false);
      assert.notStrictEqual(result.exit_code, 0);
      assert.match(result.stderr, /command_does_not_exist_12345/);
    } finally {
      teardown();
    }
  });
});

// ─── 8. DATABASE INVARIANT (structural verification) ───────────────────────

test('8. Database unique partial index — structural verification', async () => {
  const migrationPath = path.resolve(
    process.cwd(),
    '../../supabase/migrations/20260922200702_unique_active_session.sql'
  );
  assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  assert.match(sql, /CREATE UNIQUE INDEX/i);
  assert.match(sql, /task_id.*user_id|user_id.*task_id/);
  assert.match(sql, /WHERE status = 'ACTIVE'/i);
  // Concurrent-insert enforcement: Not executed — Supabase environment unavailable.
  // The unique partial index prevents two concurrent INSERTs from both succeeding.
});
