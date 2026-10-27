import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  applyStringEdit,
  countOccurrences,
  detectEol,
  normalizeEol,
  findFuzzyWhitespaceMatch,
  generateUnifiedDiff,
  writeAtomicFile,
  hasUtf8Bom,
  stripUtf8Bom,
  restoreUtf8Bom,
  UTF8_BOM,
} from './editor.js';

test('Phase 4 Complete Editor Hardening & Regression Suite', async (t) => {
  let tmpDir: string;

  t.beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-phase4-editor-suite-'));
  });

  t.afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  await t.test('1. Rejects ambiguous matches without replaceAll, succeeds when replaceAll is true', () => {
    const content = 'foo bar foo baz foo';
    assert.strictEqual(countOccurrences(content, 'foo'), 3);

    // Should throw ambiguous error
    assert.throws(
      () => applyStringEdit(content, { search: 'foo', replace: 'qux' }),
      /Ambiguous match: found 3 occurrences/,
    );

    // Should replace all when flag is true
    const replacedAll = applyStringEdit(content, { search: 'foo', replace: 'qux', replaceAll: true });
    assert.strictEqual(replacedAll, 'qux bar qux baz qux');

    // Should succeed on unique occurrence
    const uniqueReplaced = applyStringEdit(content, { search: 'baz', replace: 'qux' });
    assert.strictEqual(uniqueReplaced, 'foo bar foo qux foo');
  });

  await t.test('2. Restricts edits to specified line range [startLine, endLine]', () => {
    const file = ['const a = 1;', 'const x = 10;', 'const b = 2;', 'const x = 20;', 'const c = 3;'].join('\n');

    // Searching 'const x = ' globally is ambiguous (2 occurrences)
    assert.throws(
      () => applyStringEdit(file, { search: 'const x = 10;', replace: 'const x = 99;', startLine: 3, endLine: 5 }),
      /Search string not found within specified line range \[3, 5\]/,
    );

    // Targeting lines 1-3 isolates the first occurrence
    const updated = applyStringEdit(file, {
      search: 'const x = 10;',
      replace: 'const x = 99;',
      startLine: 1,
      endLine: 3,
    });
    assert.ok(updated.includes('const x = 99;'));
    assert.ok(updated.includes('const x = 20;'));
  });

  await t.test('3. Throws on invalid line ranges', () => {
    const file = 'line 1\nline 2\nline 3';
    assert.throws(
      () => applyStringEdit(file, { search: 'line', replace: 'row', startLine: 4, endLine: 2 }),
      /Invalid line range: start_line \(4\) exceeds end_line \(2\)/,
    );
  });

  await t.test('4. Gracefully falls back to fuzzy whitespace matching', () => {
    const file = [
      'function test() {',
      '    const greeting   =   "hello world";',
      '    return greeting;',
      '}',
    ].join('\n');

    // Search with tabs and single spaces
    const search = '  const greeting = "hello world";';
    const replace = '    const greeting = "hello scout";';

    const updated = applyStringEdit(file, { search, replace });
    assert.ok(updated.includes('const greeting = "hello scout";'));
    assert.ok(updated.includes('return greeting;'));
  });

  await t.test('5. Rejects ambiguous fuzzy whitespace matches', () => {
    const file = [
      'function a() {',
      '  const x = 1;',
      '}',
      'function b() {',
      '    const x = 1;',
      '}',
    ].join('\n');

    // Search with tabs so neither line is an exact literal match, triggering fuzzy matching
    assert.throws(
      () => applyStringEdit(file, { search: '\tconst x = 1;', replace: 'const x = 2;' }),
      /Ambiguous match: found 2 occurrences matching with flexible whitespace/,
    );
  });

  await t.test('6. Preserves CRLF line endings across modifications', () => {
    const crlfFile = 'line 1\r\nline 2\r\nline 3\r\n';
    assert.strictEqual(detectEol(crlfFile), '\r\n');

    const updated = applyStringEdit(crlfFile, { search: 'line 2', replace: 'modified line 2' });
    assert.ok(updated.includes('modified line 2'));
    assert.strictEqual(detectEol(updated), '\r\n');
    assert.ok(!updated.includes('\r\r\n'));
    assert.strictEqual(updated, 'line 1\r\nmodified line 2\r\nline 3\r\n');
  });

  await t.test('7. Detects and preserves UTF-8 BOM headers', () => {
    const withBom = UTF8_BOM + 'import React from "react";\nconst App = () => <div>App</div>;\n';
    assert.strictEqual(hasUtf8Bom(withBom), true);
    assert.strictEqual(stripUtf8Bom(withBom).startsWith(UTF8_BOM), false);

    // Edit line 1 directly
    const updated = applyStringEdit(withBom, {
      search: 'import React from "react";',
      replace: 'import * as React from "react";',
    });

    assert.strictEqual(hasUtf8Bom(updated), true);
    assert.ok(updated.includes('import * as React from "react";'));
  });

  await t.test('8. Handles multi-byte Unicode and Emoji characters seamlessly', () => {
    const unicodeFile = 'const status = "🚀 Initializing";\nconst name = "日本語・한국어";\n';
    const updated = applyStringEdit(unicodeFile, {
      search: '"🚀 Initializing"',
      replace: '"✨ Ready! 🎯"',
    });

    assert.strictEqual(updated, 'const status = "✨ Ready! 🎯";\nconst name = "日本語・한국어";\n');

    const updatedLang = applyStringEdit(updated, {
      search: '"日本語・한국어"',
      replace: '"🌍 Worldwide"',
    });
    assert.strictEqual(updatedLang, 'const status = "✨ Ready! 🎯";\nconst name = "🌍 Worldwide";\n');
  });

  await t.test('9. Produces accurate unified diffs', () => {
    const oldContent = 'const a = 1;\nconst b = 2;\nconst c = 3;\n';
    const newContent = 'const a = 1;\nconst b = 42;\nconst c = 3;\n';

    const diff = generateUnifiedDiff('src/calc.ts', oldContent, newContent);
    assert.ok(diff.includes('--- a/src/calc.ts'));
    assert.ok(diff.includes('+++ b/src/calc.ts'));
    assert.ok(diff.includes('-const b = 2;'));
    assert.ok(diff.includes('+const b = 42;'));
  });

  await t.test('10. Performs atomic writes and cleans up temporary files', async () => {
    const targetFile = path.join(tmpDir, 'atomic.txt');
    await fs.writeFile(targetFile, 'initial content\n', 'utf8');

    await writeAtomicFile(targetFile, 'new atomic content\n');
    const content = await fs.readFile(targetFile, 'utf8');
    assert.strictEqual(content, 'new atomic content\n');

    // Verify no leftover .scout-tmp files exist in directory
    const dirEntries = await fs.readdir(tmpDir);
    const tmpArtifacts = dirEntries.filter((f) => f.includes('.scout-tmp-'));
    assert.strictEqual(tmpArtifacts.length, 0, 'No temporary staging files should remain');
  });
});
