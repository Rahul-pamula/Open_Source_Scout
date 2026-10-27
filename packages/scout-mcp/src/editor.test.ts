import test from 'node:test';
import assert from 'node:assert';
import { countOccurrences, applyStringEdit, generateUnifiedDiff, detectEol, normalizeEol } from './editor.js';

test('Editor Ambiguity & Replacement Test Suite', async (t) => {
  await t.test('accurately counts non-overlapping occurrences', () => {
    assert.strictEqual(countOccurrences('hello world hello', 'hello'), 2);
    assert.strictEqual(countOccurrences('aaa', 'aa'), 1);
    assert.strictEqual(countOccurrences('const a = 1;', 'let'), 0);
    assert.strictEqual(countOccurrences('const a = 1;', ''), 0);
  });

  await t.test('successfully replaces unique match in content', () => {
    const original = 'const port = 3000;\napp.listen(port);';
    const updated = applyStringEdit(original, { search: '3000', replace: '8080' });
    assert.strictEqual(updated, 'const port = 8080;\napp.listen(port);');
  });

  await t.test('throws error when search string is not found', () => {
    const original = 'const port = 3000;';
    assert.throws(
      () => applyStringEdit(original, { search: '4000', replace: '8080' }),
      /Search string not found in file/
    );
  });

  await t.test('detects and rejects ambiguous multi-match occurrences when replaceAll is false', () => {
    const original = 'log("init");\nlog("init");';
    assert.throws(
      () => applyStringEdit(original, { search: 'log("init");', replace: 'console.log("ready");' }),
      (err: any) => {
        assert.ok(err.message.includes('Ambiguous match: found 2 occurrences'));
        assert.ok(err.message.includes('Provide more context'));
        return true;
      }
    );
  });

  await t.test('allows multi-match replacement when replaceAll is explicitly true', () => {
    const original = 'const x = 1;\nconst y = 1;';
    const updated = applyStringEdit(original, { search: '1', replace: '2', replaceAll: true });
    assert.strictEqual(updated, 'const x = 2;\nconst y = 2;');
  });

  await t.test('targets replacement within specific line range', () => {
    const original = 'line 1\nline 2: target\nline 3: other\nline 4: target\nline 5';
    // Constrain to lines 1 to 3, so only line 2 is replaced
    const updated = applyStringEdit(original, {
      search: 'target',
      replace: 'UPDATED',
      startLine: 1,
      endLine: 3,
    });
    assert.strictEqual(updated, 'line 1\nline 2: UPDATED\nline 3: other\nline 4: target\nline 5');
  });

  await t.test('throws when search is absent in line range', () => {
    const original = 'line 1\nline 2\nline 3: target';
    assert.throws(
      () =>
        applyStringEdit(original, {
          search: 'target',
          replace: 'UPDATED',
          startLine: 1,
          endLine: 2,
        }),
      /Search string not found within specified line range/
    );
  });

  await t.test('throws when startLine exceeds endLine', () => {
    const original = 'line 1\nline 2';
    assert.throws(
      () =>
        applyStringEdit(original, {
          search: 'line',
          replace: 'foo',
          startLine: 5,
          endLine: 2,
        }),
      /Invalid line range/
    );
  });

  await t.test('generates valid unified diff between file contents', () => {
    const oldContent = 'line 1\nline 2\nline 3';
    const newContent = 'line 1\nline 2: modified\nline 3';
    const diff = generateUnifiedDiff('src/app.ts', oldContent, newContent);

    assert.ok(diff.includes('--- a/src/app.ts'), 'Diff should include old file path');
    assert.ok(diff.includes('+++ b/src/app.ts'), 'Diff should include new file path');
    assert.ok(diff.includes('@@ -1,3 +1,3 @@'), 'Diff should include hunk header');
    assert.ok(diff.includes('-line 2'), 'Diff should indicate removed line');
    assert.ok(diff.includes('+line 2: modified'), 'Diff should indicate added line');

    // Identical content produces empty diff
    assert.strictEqual(generateUnifiedDiff('src/app.ts', oldContent, oldContent), '');
  });

  await t.test('detects and normalizes line endings correctly', () => {
    assert.strictEqual(detectEol('foo\r\nbar\r\nbaz'), '\r\n');
    assert.strictEqual(detectEol('foo\nbar\nbaz'), '\n');

    const mixed = 'line 1\r\nline 2\nline 3';
    assert.strictEqual(normalizeEol(mixed, '\n'), 'line 1\nline 2\nline 3');
    assert.strictEqual(normalizeEol(mixed, '\r\n'), 'line 1\r\nline 2\r\nline 3');
  });

  await t.test('seamlessly edits CRLF file using LF search/replace and preserves CRLF', () => {
    const crlfFile = 'function test() {\r\n  return 1;\r\n}\r\n';
    const lfSearch = 'function test() {\n  return 1;\n}';
    const lfReplace = 'function test() {\n  return 2;\n}';

    const result = applyStringEdit(crlfFile, { search: lfSearch, replace: lfReplace });
    assert.strictEqual(result, 'function test() {\r\n  return 2;\r\n}\r\n');
    assert.strictEqual(detectEol(result), '\r\n', 'Result must retain CRLF line endings');
  });

  await t.test('seamlessly edits LF file using CRLF search/replace and preserves LF', () => {
    const lfFile = 'function test() {\n  return 1;\n}\n';
    const crlfSearch = 'function test() {\r\n  return 1;\r\n}';
    const crlfReplace = 'function test() {\r\n  return 2;\r\n}';

    const result = applyStringEdit(lfFile, { search: crlfSearch, replace: crlfReplace });
    assert.strictEqual(result, 'function test() {\n  return 2;\n}\n');
    assert.strictEqual(detectEol(result), '\n', 'Result must retain LF line endings');
  });
});
