import test from 'node:test';
import assert from 'node:assert';
import { countOccurrences, applyStringEdit } from './editor.js';

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
});
