import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import { ProcessManager } from './harness.js';
import { streamReadFile } from './fileStream.js';
import { applyStringEdit } from './editor.js';

const execAsync = promisify(exec);

describe('Scout MCP Performance Benchmark Suite', () => {
  let tempDir: string;
  const sessionId = 'bench-session-125';
  const processManager = new ProcessManager();

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-bench-'));

    // Create a 1MB test fixture file for stream and read benchmarks
    const chunk = 'abcdefghijklmnopqrstuvwxyz0123456789\n';
    const lines = 30000;
    const content = chunk.repeat(lines);
    await fs.writeFile(path.join(tempDir, 'large-fixture.txt'), content, 'utf8');
  });

  after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('1. measures command execution overhead of ProcessManager vs raw child_process', async () => {
    const iterations = 5;
    const testCommand = 'node -e "process.stdout.write(\'ok\')"';

    // Warm up
    await execAsync(testCommand);
    await processManager.runCommand(sessionId, testCommand, tempDir);

    // Baseline: Raw execAsync
    const rawStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const res = await execAsync(testCommand);
      assert.strictEqual(res.stdout, 'ok');
    }
    const rawTotalMs = performance.now() - rawStart;
    const rawAvgMs = rawTotalMs / iterations;

    // Scout MCP ProcessManager with tree tracking, telemetry, and signal handlers
    const scoutStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const res = await processManager.runCommand(sessionId, testCommand, tempDir);
      assert.strictEqual(res.stdout, 'ok');
      assert.strictEqual(res.exitCode, 0);
    }
    const scoutTotalMs = performance.now() - scoutStart;
    const scoutAvgMs = scoutTotalMs / iterations;

    const overheadMs = Math.max(0, scoutAvgMs - rawAvgMs);

    console.log(
      `[Benchmark] Command Latency — Raw: ${rawAvgMs.toFixed(2)}ms | Scout: ${scoutAvgMs.toFixed(2)}ms | Overhead: ${overheadMs.toFixed(2)}ms`,
    );

    // Scout harness overhead must be strictly sub-50ms per command
    assert.ok(
      overheadMs < 50,
      `Harness overhead (${overheadMs.toFixed(2)}ms) must be strictly less than 50ms`,
    );
  });

  it('2. measures chunked streamReadFile latency and memory efficiency', async () => {
    const targetFile = path.join(tempDir, 'large-fixture.txt');

    const start = performance.now();
    const result = await streamReadFile(targetFile, { limit: 64 * 1024 });
    const durationMs = performance.now() - start;

    assert.ok(result.totalBytes > 1000000, 'Must reflect 1MB+ total bytes');
    assert.strictEqual(result.bytesRead, 64 * 1024, 'Must read requested 64KB chunk');
    assert.strictEqual(result.truncated, false);

    console.log(
      `[Benchmark] Stream Read (64KB slice from ~1.1MB file): ${durationMs.toFixed(2)}ms (total: ${result.totalBytes} bytes)`,
    );

    // Reading a 64KB slice from a 1MB file via stream should complete in < 25ms
    assert.ok(durationMs < 25, `Stream read duration (${durationMs.toFixed(2)}ms) must be under 25ms`);
  });

  it('3. measures applyStringEdit transformation throughput (>1000 ops/sec)', async () => {
    const sampleCode = `
function calculateTax(subtotal, taxRate) {
  const taxable = subtotal > 0;
  if (!taxable) return 0;
  return subtotal * taxRate;
}
`.repeat(50);

    const ops = 200;
    const start = performance.now();

    for (let i = 0; i < ops; i++) {
      const replaced = applyStringEdit(sampleCode, {
        search: 'const taxable = subtotal > 0;',
        replace: 'const taxable = subtotal >= 0;',
        replaceAll: true,
      });
      assert.ok(replaced.includes('subtotal >= 0;'));
    }

    const durationMs = performance.now() - start;
    const opsPerSec = (ops / durationMs) * 1000;

    console.log(
      `[Benchmark] applyStringEdit Throughput: ${opsPerSec.toFixed(0)} ops/sec (${durationMs.toFixed(2)}ms for ${ops} ops)`,
    );

    assert.ok(
      opsPerSec > 1000,
      `Throughput (${opsPerSec.toFixed(0)} ops/sec) must exceed 1000 ops/sec`,
    );
  });
});
