import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  listScoutResources,
  listScoutResourceTemplates,
  isScoutResourceUri,
  readScoutResource,
} from './resources.js';
import {
  resolveProgressToken,
  emitProgressNotification,
  createProgressCallback,
  NotificationSender,
} from './progress.js';
import {
  recordTimelineEvent,
  getTimelineEvents,
  recordCommand,
  getEvidence,
} from './evidence.js';
import { exportSessionBundle } from './bundle.js';
import { streamReadFile } from './fileStream.js';
import { saveLocalState } from './localState.js';

describe('MCP Phase 7 Comprehensive Protocol & Resources Suite', () => {
  const sessionId = 'phase7-capstone-session-001';
  let tempCwd: string;

  beforeEach(async () => {
    tempCwd = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-phase7-test-'));
    await fs.rm(path.join(process.cwd(), '.scout-tmp', 'sessions', sessionId), {
      recursive: true,
      force: true,
    });
    await saveLocalState(
      {
        sessions: {
          [sessionId]: {
            session_id: sessionId,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            last_heartbeat_at: new Date().toISOString(),
            starting_commit_hash: 'phase7hash',
            task_description: 'Phase 7 capstone validation task',
            workspace_path: tempCwd,
          },
        },
      },
      tempCwd,
    );
  });

  afterEach(async () => {
    await fs.rm(tempCwd, { recursive: true, force: true });
    await fs.rm(path.join(process.cwd(), '.scout-tmp', 'sessions', sessionId), {
      recursive: true,
      force: true,
    });
  });

  it('1. registers and enumerates all MCP Resources and ResourceTemplates', () => {
    const resources = listScoutResources();
    assert.ok(resources.length >= 1);
    assert.ok(resources.some((r) => r.uri === 'scout://skills'));

    const templates = listScoutResourceTemplates();
    assert.equal(templates.length, 3);
    const uris = templates.map((t) => t.uriTemplate);
    assert.ok(uris.includes('scout://sessions/{session_id}/diff'));
    assert.ok(uris.includes('scout://sessions/{session_id}/status'));
    assert.ok(uris.includes('scout://sessions/{session_id}/evidence'));

    assert.equal(isScoutResourceUri('scout://skills'), true);
    assert.equal(isScoutResourceUri(`scout://sessions/${sessionId}/diff`), true);
    assert.equal(isScoutResourceUri(`scout://sessions/${sessionId}/status`), true);
    assert.equal(isScoutResourceUri(`scout://sessions/${sessionId}/evidence`), true);
    assert.equal(isScoutResourceUri('https://example.com'), false);
  });

  it('2. reads status and skills resources accurately', async () => {
    // Read status resource
    const statusRes = await readScoutResource(
      `scout://sessions/${sessionId}/status`,
      tempCwd,
    );
    assert.equal(statusRes.mimeType, 'application/json');
    const statusData = JSON.parse(statusRes.text);
    assert.equal(statusData.session_id, sessionId);
    assert.equal(statusData.status, 'ACTIVE');

    // Read skills resource
    const skillsRes = await readScoutResource('scout://skills', tempCwd);
    assert.equal(skillsRes.mimeType, 'application/json');
    const skillsData = JSON.parse(skillsRes.text);
    assert.ok(typeof skillsData.count === 'number');
    assert.ok(Array.isArray(skillsData.skills));
  });

  it('3. verifies progress token resolution and notification delivery', async () => {
    assert.equal(
      resolveProgressToken({ _meta: { progressToken: 'meta-token-123' } }),
      'meta-token-123',
    );
    assert.equal(
      resolveProgressToken({ arguments: { progress_token: 'arg-token-456' } }),
      'arg-token-456',
    );

    const notifications: any[] = [];
    const sender: NotificationSender = {
      async notification(msg) {
        notifications.push(msg);
      },
    };

    const cb = createProgressCallback(sender, 'progress-tok');
    assert.ok(cb);
    await cb(25, 100, 'Processing...');
    await cb(100, 100, 'Complete');

    assert.equal(notifications.length, 2);
    assert.equal(notifications[0].params.progress, 25);
    assert.equal(notifications[1].params.progress, 100);
  });

  it('4. records telemetry and structured timeline events', async () => {
    const origCwd = process.cwd();
    try {
      process.chdir(tempCwd);

      await recordTimelineEvent(sessionId, 'START', 'Session initialized');
      await recordCommand(sessionId, 'echo "telemetry test"', 0, new Date().toISOString(), {
        duration_ms: 15,
        cpu_user_micros: 8000,
        cpu_system_micros: 2000,
        peak_memory_rss_bytes: 35000000,
      });
      await recordTimelineEvent(sessionId, 'SUBMIT', 'Submitted work');

      const evidence = await getEvidence(sessionId);
      assert.equal(evidence.commands.length, 1);
      assert.equal(evidence.commands[0].telemetry?.duration_ms, 15);
      assert.equal(evidence.telemetry?.total_command_duration_ms, 15);

      const timeline = await getTimelineEvents(sessionId);
      assert.equal(timeline.length, 3); // START, EXEC (from recordCommand), SUBMIT
      assert.equal(timeline[0].type, 'START');
      assert.equal(timeline[1].type, 'EXEC');
      assert.equal(timeline[2].type, 'SUBMIT');
    } finally {
      process.chdir(origCwd);
    }
  });

  it('5. exports full offline session bundle archive', async () => {
    const origCwd = process.cwd();
    try {
      process.chdir(tempCwd);

      const bundle = await exportSessionBundle(sessionId, undefined, tempCwd);
      assert.ok(bundle.bundlePath);
      assert.ok(bundle.sizeBytes > 0);
      assert.match(bundle.sha256, /^[a-f0-9]{64}$/);
      assert.ok(bundle.filesIncluded.includes('manifest.json'));
      assert.ok(bundle.filesIncluded.includes('session.json'));
      assert.ok(bundle.filesIncluded.includes('evidence.json'));
      assert.ok(bundle.filesIncluded.includes('timeline.json'));
    } finally {
      process.chdir(origCwd);
    }
  });

  it('6. validates high-performance chunked file streaming', async () => {
    const testFile = path.join(tempCwd, 'large-stream-test.txt');
    const sampleText = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(200);
    await fs.writeFile(testFile, sampleText, 'utf8');

    const result = await streamReadFile(testFile, { offset: 50, limit: 100 });
    assert.equal(result.content.length, 100);
    assert.equal(result.bytesRead, 100);
    assert.equal(result.totalBytes, Buffer.byteLength(sampleText, 'utf8'));
    assert.equal(result.offset, 50);
  });
});
