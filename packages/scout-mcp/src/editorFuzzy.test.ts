import test from 'node:test';
import assert from 'node:assert';
import { applyStringEdit } from './editor.js';

test('Editor Fuzzy Indentation & Whitespace Test Suite', async (t) => {
  await t.test('matches and replaces block when indentation differs (2-space vs 4-space)', () => {
    const fileContent = [
      'class Server {',
      '    start() {',
      '        console.log("running");',
      '    }',
      '}',
    ].join('\n');

    // LLM query provides 2 spaces indentation instead of 4
    const search = [
      'start() {',
      '  console.log("running");',
      '}',
    ].join('\n');

    const replace = [
      'start() {',
      '    console.log("v2 active");',
      '}',
    ].join('\n');

    const updated = applyStringEdit(fileContent, { search, replace });
    assert.ok(updated.includes('console.log("v2 active");'));
  });

  await t.test('matches and replaces when search has leading, trailing, and tab whitespace differences', () => {
    const fileContent = '\tconst sum = (a, b) => a + b;\n';
    const search = '    const sum = (a, b) => a + b;   ';
    const replace = '    const sum = (a: number, b: number): number => a + b;';

    const updated = applyStringEdit(fileContent, { search, replace });
    assert.strictEqual(updated, '    const sum = (a: number, b: number): number => a + b;\n');
  });

  await t.test('detects and rejects ambiguous fuzzy multi-matches', () => {
    const fileContent = [
      'function log() {',
      '    return 1;',
      '}',
      'function log() {',
      '  return 1;',
      '}',
    ].join('\n');

    const search = 'function log() {\n return 1;\n}';

    assert.throws(
      () => applyStringEdit(fileContent, { search, replace: 'function log() { return 2; }' }),
      /Ambiguous match: found 2 occurrences matching with flexible whitespace/
    );
  });
});
