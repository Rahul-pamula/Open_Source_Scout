import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  loadSkills,
  SkillLRUCache,
  clearSkillCache,
  getSkillCacheStats,
  parseSkillFrontmatter,
  rankSkillsByRelevance,
} from './skills.js';
import {
  listScoutPrompts,
  getScoutPrompt,
  isScoutPrompt,
} from './prompts.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { server, ListSkillsSchema } from './index.js';

test('Phase 6 Complete Skills Engine, TF-IDF Ranking & MCP Prompts Regression Suite', async (t) => {
  let tmpDir: string;
  let skillsDir: string;
  let client: Client;

  t.before(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'phase6-test-client', version: '2.0.0' }, { capabilities: {} });
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  t.beforeEach(async () => {
    clearSkillCache();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-phase6-suite-'));
    skillsDir = path.join(tmpDir, '.scout', 'skills');
    await fs.mkdir(skillsDir, { recursive: true });
  });

  t.afterEach(async () => {
    clearSkillCache();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  await t.test('1. Validates YAML frontmatter parsing and robust error recovery', () => {
    // Valid skill with complete metadata
    const validRaw = `---
name: database-sharding
description: Database horizontal partitioning and consistent hashing guidelines.
trigger: CONDITIONAL
languages:
  - postgresql
  - go
tags:
  - database
  - distributed-systems
---
# Sharding Architecture
Consistent hashing ring strategies.`;

    const resValid = parseSkillFrontmatter(validRaw, 'database-sharding.md');
    assert.strictEqual(resValid.success, true);
    assert.ok(resValid.skill);
    assert.strictEqual(resValid.skill.name, 'database-sharding');
    assert.strictEqual(resValid.skill.trigger, 'CONDITIONAL');
    assert.deepStrictEqual(resValid.skill.languages, ['postgresql', 'go']);
    assert.deepStrictEqual(resValid.skill.tags, ['database', 'distributed-systems']);

    // Malformed YAML with unclosed array
    const malformedRaw = `---
name: [unclosed array
description: Broken syntax
---
# Content`;
    const resMalformed = parseSkillFrontmatter(malformedRaw, 'malformed.md');
    assert.strictEqual(resMalformed.success, false);
    assert.ok(resMalformed.warning?.includes('YAML syntax parse error'));

    // Missing mandatory field (name)
    const missingNameRaw = `---
description: No name here
---
# Content`;
    const resMissing = parseSkillFrontmatter(missingNameRaw, 'missing-name.md');
    assert.strictEqual(resMissing.success, false);
    assert.ok(resMissing.warning?.includes("missing mandatory 'name'"));

    // Missing frontmatter delimiters
    const noDelimRaw = `# Just Markdown\nNo frontmatter`;
    const resNoDelim = parseSkillFrontmatter(noDelimRaw, 'no-delim.md');
    assert.strictEqual(resNoDelim.success, false);
    assert.ok(resNoDelim.warning?.includes('missing frontmatter delimiters'));
  });

  await t.test('2. Validates SkillLRUCache mtime invalidation and capacity eviction', async () => {
    const cache = new SkillLRUCache(2);

    const skillA = {
      filename: 'a.md',
      name: 'a',
      description: 'Skill A',
      trigger: 'CONDITIONAL' as const,
      content: 'A',
      tags: [],
      languages: [],
    };
    const skillB = { ...skillA, filename: 'b.md', name: 'b' };
    const skillC = { ...skillA, filename: 'c.md', name: 'c' };

    // Set entries
    cache.set('/path/a.md', 1000, skillA);
    cache.set('/path/b.md', 2000, skillB);

    // Hit cache with matching mtime
    assert.strictEqual(cache.get('/path/a.md', 1000)?.name, 'a');
    assert.strictEqual(cache.getStats().hits, 1);

    // Miss cache when mtime changes
    assert.strictEqual(cache.get('/path/a.md', 1001), undefined);
    assert.strictEqual(cache.getStats().misses, 1);

    // Eviction test: re-access b then add c, a should be evicted
    cache.set('/path/a.md', 1000, skillA);
    cache.get('/path/b.md', 2000); // b is now accessed more recently than a
    cache.set('/path/c.md', 3000, skillC);

    assert.strictEqual(cache.get('/path/a.md', 1000), undefined); // evicted
    assert.strictEqual(cache.get('/path/b.md', 2000)?.name, 'b');
    assert.strictEqual(cache.get('/path/c.md', 3000)?.name, 'c');
  });

  await t.test('3. Validates TF-IDF relevance ranking with field weighting and language affinity', () => {
    const skills = [
      {
        filename: 'python-pandas.md',
        name: 'python-pandas',
        description: 'Dataframe manipulation and vectorized operations in Python.',
        trigger: 'CONDITIONAL' as const,
        content: 'Vectorized series calculation and memory optimization.',
        tags: ['data', 'analytics'],
        languages: ['python'],
      },
      {
        filename: 'rust-tokio.md',
        name: 'rust-tokio',
        description: 'Asynchronous event loop and multi-threaded Tokio runtime in Rust.',
        trigger: 'CONDITIONAL' as const,
        content: 'Actor model and message passing concurrency.',
        tags: ['systems', 'backend'],
        languages: ['rust'],
      },
      {
        filename: 'common-linter.md',
        name: 'common-linter',
        description: 'Universal repository linting and formatting rule.',
        trigger: 'ALWAYS' as const,
        content: 'Style enforcement.',
        tags: [],
        languages: [],
      },
    ];

    // Query targeting Rust concurrency
    const rankedRust = rankSkillsByRelevance(
      skills,
      'multi-threaded tokio async runtime worker',
      { languages: ['rust'] },
    );

    // ALWAYS skill is pinned first
    assert.strictEqual(rankedRust[0].name, 'common-linter');
    // Rust skill ranked ahead of Python due to query + language affinity
    assert.strictEqual(rankedRust[1].name, 'rust-tokio');

    // Query targeting Python data
    const rankedPython = rankSkillsByRelevance(
      skills,
      'vectorized dataframe analytics',
      { languages: ['python'], tags: ['data'] },
    );
    assert.strictEqual(rankedPython[0].name, 'common-linter');
    assert.strictEqual(rankedPython[1].name, 'python-pandas');
  });

  await t.test('4. Validates MCP Prompts registration, schema, and dispatch', () => {
    // Verify prompt list
    const prompts = listScoutPrompts();
    assert.strictEqual(prompts.length, 3);

    const promptNames = prompts.map((p) => p.name);
    assert.ok(promptNames.includes('scout_architect_mode'));
    assert.ok(promptNames.includes('scout_debug_issue'));
    assert.ok(promptNames.includes('scout_prepare_pr'));

    assert.strictEqual(isScoutPrompt('scout_architect_mode'), true);
    assert.strictEqual(isScoutPrompt('unknown_prompt'), false);

    // Test scout_architect_mode
    const archPrompt = getScoutPrompt('scout_architect_mode', {
      feature_request: 'Implement distributed consensus Raft protocol',
      architecture_constraints: 'Target ecosystem is Rust with zero-allocation buffers',
    });
    assert.strictEqual(archPrompt.description.includes('implementation plan'), true);
    assert.ok(archPrompt.messages[0].content.text.includes('Raft protocol'));
    assert.ok(archPrompt.messages[0].content.text.includes('Rust'));

    // Test scout_debug_issue
    const debugPrompt = getScoutPrompt('scout_debug_issue', {
      issue_description: 'Segmentation fault on concurrent queue push',
      error_logs: 'SIGSEGV: 0x00000000',
    });
    assert.ok(debugPrompt.messages[0].content.text.includes('Segmentation fault'));
    assert.ok(debugPrompt.messages[0].content.text.includes('SIGSEGV'));

    // Test scout_prepare_pr
    const prPrompt = getScoutPrompt('scout_prepare_pr', {
      pr_title: 'feat(consensus): implement Raft distributed consensus protocol',
      changes_summary: '- Add Raft node state machine\n- Add election timer',
      issue_number: '589',
    });
    assert.ok(prPrompt.messages[0].content.text.includes('Raft distributed consensus'));
    assert.ok(prPrompt.messages[0].content.text.includes('589'));

    // Unknown prompt throws
    assert.throws(() => getScoutPrompt('invalid_prompt', {}), /Unknown prompt: invalid_prompt/);
  });

  await t.test('5. Validates end-to-end list_skills MCP tool execution and schema compliance', async () => {
    // Create test skills in workspace
    await fs.writeFile(
      path.join(skillsDir, 'go-grpc.md'),
      `---
name: go-grpc
description: High-performance Protocol Buffers and gRPC streaming in Go.
trigger: CONDITIONAL
languages:
  - go
tags:
  - backend
  - rpc
---
# Go gRPC Guide`,
      'utf8',
    );

    await fs.writeFile(
      path.join(skillsDir, 'react-hooks.md'),
      `---
name: react-hooks
description: Custom hooks and state synchronization patterns for React.
trigger: CONDITIONAL
languages:
  - typescript
tags:
  - frontend
---
# React Hooks Guide`,
      'utf8',
    );

    // Unfiltered call via MCP Client
    const resUnfiltered = await client.callTool({
      name: 'list_skills',
      arguments: { cwd: tmpDir },
    });
    assert.strictEqual(resUnfiltered.isError, undefined);
    const payloadUnfiltered = JSON.parse((resUnfiltered.content[0] as any).text);
    assert.strictEqual(payloadUnfiltered.count, 2);

    // Filtered call via MCP Client
    const resFiltered = await client.callTool({
      name: 'list_skills',
      arguments: {
        cwd: tmpDir,
        task_description: 'Design streaming gRPC microservice in Go',
        languages: ['go'],
      },
    });

    assert.strictEqual(resFiltered.isError, undefined);
    assert.ok(Array.isArray(resFiltered.content));
    const payloadFiltered = JSON.parse((resFiltered.content[0] as any).text);

    assert.strictEqual(payloadFiltered.count, 1);
    // Go gRPC skill must rank first due to language affinity and TF-IDF terms
    assert.strictEqual(payloadFiltered.skills[0].name, 'go-grpc');
    assert.strictEqual(payloadFiltered.skills[0].filename, 'go-grpc.md');
    assert.deepStrictEqual(payloadFiltered.skills[0].languages, ['go']);
    assert.deepStrictEqual(payloadFiltered.skills[0].tags, ['backend', 'rpc']);
  });
});
