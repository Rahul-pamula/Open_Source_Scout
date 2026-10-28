import test from 'node:test';
import assert from 'node:assert';
import { listScoutPrompts, getScoutPrompt, SCOUT_PROMPTS } from './prompts.js';

test('MCP Prompts Capability & Argument Validation Suite', async (t) => {
  await t.test('1. listScoutPrompts advertises all required workflow prompts with schemas', () => {
    const prompts = listScoutPrompts();
    assert.strictEqual(prompts.length, 3);

    const names = prompts.map((p) => p.name);
    assert.ok(names.includes('scout_architect_mode'));
    assert.ok(names.includes('scout_debug_issue'));
    assert.ok(names.includes('scout_prepare_pr'));

    for (const prompt of prompts) {
      assert.ok(prompt.name.length > 0);
      assert.ok(prompt.description.length > 10);
      assert.ok(Array.isArray(prompt.arguments));
      assert.ok(prompt.arguments.length > 0);
    }
  });

  await t.test('2. scout_architect_mode validates required feature_request and generates plan messages', () => {
    // Missing required argument throws
    assert.throws(
      () => getScoutPrompt('scout_architect_mode', {}),
      /Missing required argument 'feature_request'/,
    );

    const result = getScoutPrompt('scout_architect_mode', {
      feature_request: 'Implement distributed session state sync across IDE instances',
      architecture_constraints: 'Zero breaking changes to Scout v1; TypeScript only',
    });

    assert.ok(result.description);
    assert.strictEqual(result.messages.length, 1);
    assert.strictEqual(result.messages[0].role, 'user');
    assert.ok(result.messages[0].content.text.includes('distributed session state sync'));
    assert.ok(result.messages[0].content.text.includes('Zero breaking changes'));
    assert.ok(result.messages[0].content.text.includes('STATE.md'));
  });

  await t.test('3. scout_debug_issue validates required issue_description and includes error logs', () => {
    assert.throws(
      () => getScoutPrompt('scout_debug_issue', {}),
      /Missing required argument 'issue_description'/,
    );

    const result = getScoutPrompt('scout_debug_issue', {
      issue_description: 'Lockfile contention causes deadlock on concurrent writes',
      error_logs: 'Error: EEXIST lockfile already acquired',
      failing_file: 'src/localState.ts',
    });

    assert.strictEqual(result.messages.length, 1);
    const text = result.messages[0].content.text;
    assert.ok(text.includes('Lockfile contention'));
    assert.ok(text.includes('EEXIST lockfile'));
    assert.ok(text.includes('src/localState.ts'));
    assert.ok(text.includes('Reproduction First'));
  });

  await t.test('4. scout_prepare_pr generates structured description with co-author attribution', () => {
    assert.throws(
      () => getScoutPrompt('scout_prepare_pr', { pr_title: 'feat: add feature' }),
      /Missing required argument 'changes_summary'/,
    );

    const result = getScoutPrompt('scout_prepare_pr', {
      pr_title: 'feat(prompts): add scout workflow prompts',
      changes_summary: '- Added architectMode\n- Added debugIssue\n- Added preparePr',
      issue_number: '590',
      coauthor: 'Co-authored-by: Vaibhav Pandey <aryanpandey392@gmail.com>',
    });

    assert.strictEqual(result.messages.length, 1);
    const text = result.messages[0].content.text;
    assert.ok(text.includes('feat(prompts): add scout workflow prompts'));
    assert.ok(text.includes('Closes #590'));
    assert.ok(text.includes('Co-authored-by: Vaibhav Pandey <aryanpandey392@gmail.com>'));
  });

  await t.test('5. getScoutPrompt rejects unrecognized prompt names gracefully', () => {
    assert.throws(
      () => getScoutPrompt('non_existent_prompt', {}),
      /Unknown prompt: non_existent_prompt/,
    );
  });
});
