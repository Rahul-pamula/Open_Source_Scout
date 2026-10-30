import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import {
  recordTimelineEvent,
  getTimelineEvents,
  recordCommand,
  recordSessionTelemetry,
  getEvidence,
} from './evidence.js';

describe('MCP Telemetry & Timeline Event Suite', () => {
  const sessionId = 'test-session-telemetry-107';
  const sessionDir = path.join(process.cwd(), '.scout-tmp', 'sessions', sessionId);

  beforeEach(async () => {
    await fs.rm(sessionDir, { recursive: true, force: true });
  });

  afterEach(async () => {
    await fs.rm(sessionDir, { recursive: true, force: true });
  });

  it('1. records structured timeline events with distinct types and metadata', async () => {
    const e1 = await recordTimelineEvent(sessionId, 'START', 'Session started', {
      taskId: 'task-107',
    });
    assert.equal(e1.type, 'START');
    assert.equal(e1.summary, 'Session started');
    assert.deepEqual(e1.metadata, { taskId: 'task-107' });
    assert.ok(e1.id.startsWith('evt-'));
    assert.ok(e1.timestamp);

    const e2 = await recordTimelineEvent(sessionId, 'EDIT', 'Wrote index.ts', {
      path: 'index.ts',
      size_bytes: 120,
    });
    assert.equal(e2.type, 'EDIT');

    const e3 = await recordTimelineEvent(sessionId, 'EXEC', 'Ran test suite', {
      exitCode: 0,
    });
    assert.equal(e3.type, 'EXEC');

    const e4 = await recordTimelineEvent(sessionId, 'SUBMIT', 'Submitted for review', {
      prUrl: 'https://github.com/org/repo/pull/1',
    });
    assert.equal(e4.type, 'SUBMIT');

    const events = await getTimelineEvents(sessionId);
    assert.equal(events.length, 4);
    assert.deepEqual(
      events.map((e) => e.type),
      ['START', 'EDIT', 'EXEC', 'SUBMIT'],
    );
  });

  it('2. recordCommand attaches telemetry and aggregates cumulative metrics', async () => {
    await recordCommand(
      sessionId,
      'npm run build',
      0,
      new Date().toISOString(),
      {
        duration_ms: 250,
        cpu_user_micros: 150000,
        cpu_system_micros: 20000,
        peak_memory_rss_bytes: 45000000,
      },
    );

    let evidence = await getEvidence(sessionId);
    assert.equal(evidence.commands.length, 1);
    assert.equal(evidence.commands[0].command, 'npm run build');
    assert.equal(evidence.commands[0].telemetry?.duration_ms, 250);
    assert.equal(evidence.commands[0].telemetry?.peak_memory_rss_bytes, 45000000);
    assert.equal(evidence.telemetry?.total_command_duration_ms, 250);
    assert.equal(evidence.telemetry?.peak_rss_bytes, 45000000);

    // Second command with larger memory
    await recordCommand(
      sessionId,
      'npm test',
      0,
      new Date().toISOString(),
      {
        duration_ms: 500,
        cpu_user_micros: 350000,
        cpu_system_micros: 40000,
        peak_memory_rss_bytes: 85000000,
      },
    );

    evidence = await getEvidence(sessionId);
    assert.equal(evidence.commands.length, 2);
    assert.equal(evidence.telemetry?.total_command_duration_ms, 750);
    assert.equal(evidence.telemetry?.peak_rss_bytes, 85000000);

    // Also verify EXEC timeline events were automatically populated
    assert.ok(evidence.timeline);
    assert.equal(evidence.timeline.length, 2);
    assert.equal(evidence.timeline[0].type, 'EXEC');
    assert.equal(evidence.timeline[1].type, 'EXEC');
  });

  it('3. recordSessionTelemetry updates standalone session telemetry metrics', async () => {
    await recordSessionTelemetry(sessionId, {
      total_command_duration_ms: 1200,
      peak_rss_bytes: 104857600,
    });

    const evidence = await getEvidence(sessionId);
    assert.equal(evidence.telemetry?.total_command_duration_ms, 1200);
    assert.equal(evidence.telemetry?.peak_rss_bytes, 104857600);
    assert.ok(evidence.telemetry?.last_recorded_at);
  });

  it('4. getTimelineEvents returns empty array when no events recorded', async () => {
    const events = await getTimelineEvents('non-existent-session-107');
    assert.deepEqual(events, []);
  });
});
