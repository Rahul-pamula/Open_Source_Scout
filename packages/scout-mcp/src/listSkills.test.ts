import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { server, ListSkillsSchema } from './index.js';
import { clearSkillCache } from './skills.js';

test('MCP list_skills Tool and Schema Test Suite', async (t) => {
  let tmpDir: string;
  let client: Client;

  t.before(async () => {
    // Connect client and server via linked in-memory transports
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'test-scout-client', version: '1.0.0' }, { capabilities: {} });
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  t.beforeEach(async () => {
    clearSkillCache();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-list-skills-test-'));
  });

  t.afterEach(async () => {
    clearSkillCache();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  await t.test('ListSkillsSchema validates optional arguments and strict types', () => {
    // Empty object should be valid
    const emptyResult = ListSkillsSchema.parse({});
    assert.deepStrictEqual(emptyResult, {});

    // Full valid payload
    const fullResult = ListSkillsSchema.parse({
      task_description: 'optimize rust memory allocator',
      cwd: '/workspace/project',
      languages: ['rust', 'c++'],
      tags: ['systems', 'performance'],
    });
    assert.strictEqual(fullResult.task_description, 'optimize rust memory allocator');
    assert.strictEqual(fullResult.cwd, '/workspace/project');
    assert.deepStrictEqual(fullResult.languages, ['rust', 'c++']);
    assert.deepStrictEqual(fullResult.tags, ['systems', 'performance']);

    // Invalid language type
    assert.throws(() => ListSkillsSchema.parse({ languages: 'rust' }));

    // Invalid tags type
    assert.throws(() => ListSkillsSchema.parse({ tags: [123] }));

    // Invalid cwd type
    assert.throws(() => ListSkillsSchema.parse({ cwd: 123 }));
  });

  await t.test('tool registration exposes list_skills with correct schema', async () => {
    const { tools } = await client.listTools();
    const listSkillsTool = tools.find((tool) => tool.name === 'list_skills');

    assert.ok(listSkillsTool, 'list_skills tool should be registered');
    assert.strictEqual(
      listSkillsTool.description,
      'Query and browse available development skills, guidelines, and project conventions.',
    );
    assert.ok(listSkillsTool.inputSchema.properties?.task_description);
    assert.ok(listSkillsTool.inputSchema.properties?.cwd);
    assert.ok(listSkillsTool.inputSchema.properties?.languages);
    assert.ok(listSkillsTool.inputSchema.properties?.tags);
  });

  await t.test('returns empty skills array when workspace skills directory is empty', async () => {
    const skillsDir = path.join(tmpDir, '.scout', 'skills');
    await fs.mkdir(skillsDir, { recursive: true });

    const res = await client.callTool({
      name: 'list_skills',
      arguments: { cwd: tmpDir },
    });

    assert.strictEqual(res.isError, undefined);
    assert.ok(Array.isArray(res.content));
    assert.strictEqual((res.content[0] as any).type, 'text');

    const payload = JSON.parse((res.content[0] as any).text);
    assert.strictEqual(payload.count, 0);
    assert.deepStrictEqual(payload.skills, []);
  });

  await t.test('lists and filters skills from isolated workspace directory', async () => {
    const skillsDir = path.join(tmpDir, '.scout', 'skills');
    await fs.mkdir(skillsDir, { recursive: true });

    // Fixture 1: Rust backend skill
    await fs.writeFile(
      path.join(skillsDir, 'rust-concurrency.md'),
      `---
name: rust-concurrency
description: Advanced async Tokio and concurrency primitives for systems engineering.
trigger: CONDITIONAL
languages:
  - rust
tags:
  - backend
  - systems
---
# Rust Concurrency Guide
Guidelines for thread safety and Tokio runtime concurrency.`,
      'utf8',
    );

    // Fixture 2: React frontend skill
    await fs.writeFile(
      path.join(skillsDir, 'react-ui-perf.md'),
      `---
name: react-ui-perf
description: React component rendering optimization and bundle analysis.
trigger: CONDITIONAL
languages:
  - typescript
  - javascript
tags:
  - frontend
  - ui
---
# React Performance
Guidelines for memoization and bundle splitting.`,
      'utf8',
    );

    // Fixture 3: Python ML skill
    await fs.writeFile(
      path.join(skillsDir, 'python-ml-pipeline.md'),
      `---
name: python-ml-pipeline
description: PyTorch model training and data preprocessing pipelines.
trigger: MANUAL
languages:
  - python
tags:
  - machine-learning
  - data
---
# PyTorch ML Pipeline
Guidelines for PyTorch DataLoader and CUDA acceleration.`,
      'utf8',
    );

    // 1. Unfiltered query
    const resAll = await client.callTool({
      name: 'list_skills',
      arguments: { cwd: tmpDir },
    });
    const payloadAll = JSON.parse(((resAll as any).content[0] as any).text);
    assert.strictEqual(payloadAll.count, 3);
    assert.strictEqual(payloadAll.skills.length, 3);

    const names = payloadAll.skills.map((s: any) => s.name);
    assert.ok(names.includes('rust-concurrency'));
    assert.ok(names.includes('react-ui-perf'));
    assert.ok(names.includes('python-ml-pipeline'));

    // Check payload structure matches required schema
    const rustSkill = payloadAll.skills.find((s: any) => s.name === 'rust-concurrency');
    assert.strictEqual(rustSkill.filename, 'rust-concurrency.md');
    assert.strictEqual(rustSkill.trigger, 'CONDITIONAL');
    assert.deepStrictEqual(rustSkill.languages, ['rust']);
    assert.deepStrictEqual(rustSkill.tags, ['backend', 'systems']);

    // 2. Filter by language (typescript)
    const resLang = await client.callTool({
      name: 'list_skills',
      arguments: { cwd: tmpDir, languages: ['typescript'] },
    });
    const payloadLang = JSON.parse(((resLang as any).content[0] as any).text);
    assert.strictEqual(payloadLang.skills[0].name, 'react-ui-perf');

    // 3. Filter by tag (machine-learning)
    const resTag = await client.callTool({
      name: 'list_skills',
      arguments: { cwd: tmpDir, tags: ['machine-learning'] },
    });
    const payloadTag = JSON.parse(((resTag as any).content[0] as any).text);
    assert.strictEqual(payloadTag.skills[0].name, 'python-ml-pipeline');

    // 4. TF-IDF rank with task_description
    const resRank = await client.callTool({
      name: 'list_skills',
      arguments: {
        cwd: tmpDir,
        task_description: 'Fix tokio async race condition in multi-threaded runtime',
      },
    });
    const payloadRank = JSON.parse(((resRank as any).content[0] as any).text);
    assert.strictEqual(payloadRank.skills[0].name, 'rust-concurrency');
  });

  await t.test('ALWAYS trigger skills are prioritized at top regardless of query', async () => {
    const skillsDir = path.join(tmpDir, '.scout', 'skills');
    await fs.mkdir(skillsDir, { recursive: true });

    await fs.writeFile(
      path.join(skillsDir, 'always-rule.md'),
      `---
name: always-rule
description: Critical safety and formatting rule applied to all sessions.
trigger: ALWAYS
---
# Always Active`,
      'utf8',
    );

    await fs.writeFile(
      path.join(skillsDir, 'database-migration.md'),
      `---
name: database-migration
description: PostgreSQL database migration guide.
trigger: CONDITIONAL
---
# Database Migrations`,
      'utf8',
    );

    const res = await client.callTool({
      name: 'list_skills',
      arguments: {
        cwd: tmpDir,
        task_description: 'Execute PostgreSQL migration script',
      },
    });
    const payload = JSON.parse(((res as any).content[0] as any).text);
    assert.strictEqual(payload.skills[0].name, 'always-rule');
  });
});

