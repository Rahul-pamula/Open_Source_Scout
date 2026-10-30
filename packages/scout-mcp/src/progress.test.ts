import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveProgressToken,
  emitProgressNotification,
  createProgressCallback,
  NotificationSender,
} from './progress.js';
import { LocalHarness } from './harness/LocalHarness.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('MCP Progress Notification & Token Resolution Suite', () => {
  it('1. resolveProgressToken correctly extracts from _meta.progressToken', () => {
    // string token
    assert.equal(
      resolveProgressToken({ _meta: { progressToken: 'token-xyz-123' } }),
      'token-xyz-123',
    );
    // numeric token
    assert.equal(
      resolveProgressToken({ _meta: { progressToken: 42 } }),
      42,
    );
    // undefined if null or empty
    assert.equal(resolveProgressToken(undefined), undefined);
    assert.equal(resolveProgressToken({}), undefined);
    assert.equal(resolveProgressToken({ _meta: {} }), undefined);
  });

  it('2. resolveProgressToken falls back to arguments.progress_token', () => {
    assert.equal(
      resolveProgressToken({ arguments: { progress_token: 'arg-token-abc' } }),
      'arg-token-abc',
    );
    assert.equal(
      resolveProgressToken({ arguments: { progress_token: 99 } }),
      99,
    );
    // ignores non-string, non-numeric arguments
    assert.equal(
      resolveProgressToken({ arguments: { progress_token: { invalid: true } as any } }),
      undefined,
    );
    // _meta takes precedence over arguments
    assert.equal(
      resolveProgressToken({
        _meta: { progressToken: 'meta-token' },
        arguments: { progress_token: 'arg-token' },
      }),
      'meta-token',
    );
  });

  it('3. emitProgressNotification sends notifications/progress correctly', async () => {
    const sent: any[] = [];
    const mockSender: NotificationSender = {
      async notification(msg) {
        sent.push(msg);
      },
    };

    await emitProgressNotification(mockSender, 'tok-1', 25, 100, 'Loading resources');

    assert.equal(sent.length, 1);
    assert.deepEqual(sent[0], {
      method: 'notifications/progress',
      params: {
        progressToken: 'tok-1',
        progress: 25,
        total: 100,
        message: 'Loading resources',
      },
    });
  });

  it('4. emitProgressNotification safely handles errors and omitted total/message', async () => {
    const sent: any[] = [];
    const mockSender: NotificationSender = {
      async notification(msg) {
        sent.push(msg);
      },
    };

    // omitting total and message
    await emitProgressNotification(mockSender, 101, 50);
    assert.equal(sent.length, 1);
    assert.deepEqual(sent[0], {
      method: 'notifications/progress',
      params: {
        progressToken: 101,
        progress: 50,
      },
    });

    // undefined progressToken should be a no-op
    await emitProgressNotification(mockSender, undefined, 75);
    assert.equal(sent.length, 1);

    // failing sender should not crash caller
    const failingSender: NotificationSender = {
      async notification() {
        throw new Error('Connection lost');
      },
    };

    await assert.doesNotReject(async () => {
      await emitProgressNotification(failingSender, 'tok-err', 10, 100, 'Test error');
    });
  });

  it('5. createProgressCallback returns callback that forwards progress events', async () => {
    const sent: any[] = [];
    const mockSender: NotificationSender = {
      async notification(msg) {
        sent.push(msg);
      },
    };

    const cbUndefined = createProgressCallback(mockSender, undefined);
    assert.equal(cbUndefined, undefined);

    const cb = createProgressCallback(mockSender, 'cb-token-42');
    assert.ok(cb);

    await cb(10, 100, 'Step 1');
    await cb(50, 100, 'Step 2');
    await cb(100, 100, 'Done');

    assert.equal(sent.length, 3);
    assert.equal(sent[0].params.progress, 10);
    assert.equal(sent[1].params.progress, 50);
    assert.equal(sent[2].params.progress, 100);
    assert.equal(sent[2].params.message, 'Done');
  });

  it('6. LocalHarness.runCommand emits progress milestones', async () => {
    const harness = new LocalHarness();
    const progressEvents: { progress: number; total?: number; message?: string }[] = [];

    const onProgress = (progress: number, total?: number, message?: string) => {
      progressEvents.push({ progress, total, message });
    };

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-progress-test-'));
    try {
      const result = await harness.runCommand(
        'mock-session-id',
        'echo "progress test output"',
        tempDir,
        undefined,
        onProgress,
      );

      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.includes('progress test output'));
      assert.ok(progressEvents.length >= 2);
      assert.equal(progressEvents[0].progress, 0);
      assert.ok(progressEvents[0].message?.includes('Starting command execution'));
      assert.equal(progressEvents[progressEvents.length - 1].progress, 100);
      assert.ok(progressEvents[progressEvents.length - 1].message?.includes('Command execution completed'));
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});
