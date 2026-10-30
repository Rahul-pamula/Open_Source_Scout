import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { server } from './index.js';
import {
  listScoutResources,
  listScoutResourceTemplates,
  isScoutResourceUri,
  readScoutResource,
} from './resources.js';
import {
  matchesSessionDiffUri,
  readSessionDiffResource,
} from './resources/diffResource.js';
import {
  matchesSessionStatusUri,
  readSessionStatusResource,
} from './resources/statusResource.js';
import {
  matchesSessionEvidenceUri,
  readSessionEvidenceResource,
} from './resources/evidenceResource.js';
import {
  isSkillsResourceUri,
  readSkillsResource,
} from './resources/skillsResource.js';
import { saveLocalState } from './localState.js';
import { recordCommand } from './evidence.js';

test('MCP Resources Specification, Enumeration, and Reading Suite', async (t) => {
  let tmpDir: string;
  let client: Client;

  t.before(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'test-resources-client', version: '2.0.0' }, { capabilities: {} });
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  t.beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-resources-test-'));
  });

  t.afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  await t.test('1. Validates URI matcher helpers and scheme detection', () => {
    assert.strictEqual(isScoutResourceUri('scout://skills'), true);
    assert.strictEqual(isScoutResourceUri('scout://sessions/abc/diff'), true);
    assert.strictEqual(isScoutResourceUri('https://example.com'), false);
    assert.strictEqual(isScoutResourceUri('file:///path/to/file'), false);

    assert.strictEqual(matchesSessionDiffUri('scout://sessions/sess-123/diff'), 'sess-123');
    assert.strictEqual(matchesSessionDiffUri('scout://sessions/sess-123/status'), null);

    assert.strictEqual(matchesSessionStatusUri('scout://sessions/sess-456/status'), 'sess-456');
    assert.strictEqual(matchesSessionStatusUri('scout://sessions/sess-456/diff'), null);

    assert.strictEqual(matchesSessionEvidenceUri('scout://sessions/sess-789/evidence'), 'sess-789');
    assert.strictEqual(matchesSessionEvidenceUri('scout://sessions/sess-789/status'), null);

    assert.strictEqual(isSkillsResourceUri('scout://skills'), true);
    assert.strictEqual(isSkillsResourceUri('scout://skills/extra'), false);
  });

  await t.test('2. listResources and listResourceTemplates advertise correct schemas', async () => {
    const directResources = listScoutResources();
    assert.ok(directResources.length >= 1);
    assert.ok(directResources.some((r) => r.uri === 'scout://skills'));

    const directTemplates = listScoutResourceTemplates();
    assert.strictEqual(directTemplates.length, 3);
    const templateUris = directTemplates.map((t) => t.uriTemplate);
    assert.ok(templateUris.includes('scout://sessions/{session_id}/diff'));
    assert.ok(templateUris.includes('scout://sessions/{session_id}/status'));
    assert.ok(templateUris.includes('scout://sessions/{session_id}/evidence'));

    // Client protocol level validation
    const clientResources = await client.listResources();
    assert.ok(clientResources.resources.some((r) => r.uri === 'scout://skills'));

    const clientTemplates = await client.listResourceTemplates();
    assert.strictEqual(clientTemplates.resourceTemplates.length, 3);
  });

  await t.test('3. Reads scout://skills resource with isolated workspace', async () => {
    const skillsDir = path.join(tmpDir, '.scout', 'skills');
    await fs.mkdir(skillsDir, { recursive: true });
    await fs.writeFile(
      path.join(skillsDir, 'test-guide.md'),
      `---
name: test-guide
description: Test engineering guideline for unit tests.
trigger: ALWAYS
---
# Testing Guidelines`,
      'utf8',
    );

    const res = await readSkillsResource(tmpDir);
    assert.strictEqual(res.uri, 'scout://skills');
    assert.strictEqual(res.mimeType, 'application/json');

    const parsed = JSON.parse(res.text);
    assert.strictEqual(parsed.count, 1);
    assert.strictEqual(parsed.skills[0].name, 'test-guide');

    // Protocol level read
    const clientRes = await client.readResource({ uri: 'scout://skills' });
    assert.strictEqual(clientRes.contents[0].uri, 'scout://skills');
    assert.strictEqual(clientRes.contents[0].mimeType, 'application/json');
  });

  await t.test('4. Reads scout://sessions/{id}/status resource', async () => {
    const sessionId = 'test-session-status-id';
    await saveLocalState(
      {
        sessions: {
          [sessionId]: {
            status: 'ACTIVE',
            starting_commit_hash: 'abc1234',
            task_description: 'Fix authentication cookie issue',
            source: 'manual',
            workspace_path: tmpDir,
          },
        },
      },
      tmpDir,
    );

    const res = await readSessionStatusResource(sessionId, tmpDir);
    assert.strictEqual(res.uri, `scout://sessions/${sessionId}/status`);
    assert.strictEqual(res.mimeType, 'application/json');

    const parsed = JSON.parse(res.text);
    assert.strictEqual(parsed.session_id, sessionId);
    assert.strictEqual(parsed.status, 'ACTIVE');
    assert.strictEqual(parsed.task_description, 'Fix authentication cookie issue');
    assert.strictEqual(parsed.workspace_path, tmpDir);

    // Missing session throws error
    await assert.rejects(
      async () => readSessionStatusResource('non-existent-sess', tmpDir),
      /Session not found: non-existent-sess/,
    );
  });

  await t.test('5. Reads scout://sessions/{id}/evidence resource', async () => {
    const sessionId = 'test-session-ev-id';
    await recordCommand(sessionId, 'npm run build', 0, '2026-10-30T12:00:00Z');

    const res = await readSessionEvidenceResource(sessionId);
    assert.strictEqual(res.uri, `scout://sessions/${sessionId}/evidence`);
    assert.strictEqual(res.mimeType, 'application/json');

    const parsed = JSON.parse(res.text);
    assert.strictEqual(parsed.commands.length, 1);
    assert.strictEqual(parsed.commands[0].command, 'npm run build');
    assert.strictEqual(parsed.commands[0].exitCode, 0);

    // Cleanup evidence directory
    await fs.rm(path.join(process.cwd(), '.scout-tmp', 'sessions', sessionId), {
      recursive: true,
      force: true,
    });
  });

  await t.test('6. Reads scout://sessions/{id}/diff resource', async () => {
    const sessionId = 'test-session-diff-id';
    const res = await readSessionDiffResource(sessionId, tmpDir);

    assert.strictEqual(res.uri, `scout://sessions/${sessionId}/diff`);
    assert.strictEqual(res.mimeType, 'text/x-diff');
    assert.strictEqual(typeof res.text, 'string');
  });

  await t.test('7. readScoutResource rejects unknown or invalid URIs', async () => {
    await assert.rejects(
      async () => readScoutResource('scout://unknown/resource'),
      /Resource not found: scout:\/\/unknown\/resource/,
    );
    await assert.rejects(
      async () => readScoutResource('http://not-scout.org'),
      /Resource not found: http:\/\/not-scout.org/,
    );
  });
});
