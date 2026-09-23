import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { getEvidence, saveEvidence, recordCommand, recordChangedFiles, recordGitDiff, recordValidationResults } from './evidence.js';
import fs from 'fs/promises';
import path from 'path';

describe('Evidence Collection', () => {
  const sessionId = 'test-session-123';
  const LOCAL_STATE_DIR = path.join(process.cwd(), '.scout-tmp');
  const evidenceFile = path.join(LOCAL_STATE_DIR, 'sessions', sessionId, 'evidence.json');

  beforeEach(async () => {
    try {
      await fs.rm(path.join(LOCAL_STATE_DIR, 'sessions', sessionId), { recursive: true, force: true });
    } catch (e) {
      // Ignore
    }
  });

  afterEach(async () => {
    try {
      await fs.rm(path.join(LOCAL_STATE_DIR, 'sessions', sessionId), { recursive: true, force: true });
    } catch (e) {
      // Ignore
    }
  });

  test('getEvidence returns empty template if not exists', async () => {
    const evidence = await getEvidence(sessionId);
    assert.deepStrictEqual(evidence, {
      commands: [],
      changedFiles: [],
      gitDiff: '',
      validationResults: null
    });
  });

  test('recordCommand saves command correctly', async () => {
    await recordCommand(sessionId, 'ls -la', 0, '2023-10-01T12:00:00Z');
    const evidence = await getEvidence(sessionId);
    assert.strictEqual(evidence.commands.length, 1);
    assert.deepStrictEqual(evidence.commands[0], {
      command: 'ls -la',
      exitCode: 0,
      timestamp: '2023-10-01T12:00:00Z'
    });
  });

  test('recordChangedFiles saves files correctly', async () => {
    await recordChangedFiles(sessionId, ['index.ts', 'test.ts']);
    const evidence = await getEvidence(sessionId);
    assert.deepStrictEqual(evidence.changedFiles, ['index.ts', 'test.ts']);
  });

  test('recordGitDiff saves diff correctly', async () => {
    await recordGitDiff(sessionId, 'diff --git a/index.ts b/index.ts');
    const evidence = await getEvidence(sessionId);
    assert.strictEqual(evidence.gitDiff, 'diff --git a/index.ts b/index.ts');
  });

  test('recordValidationResults saves results correctly', async () => {
    await recordValidationResults(sessionId, { passed: true });
    const evidence = await getEvidence(sessionId);
    assert.deepStrictEqual(evidence.validationResults, { passed: true });
  });
});
