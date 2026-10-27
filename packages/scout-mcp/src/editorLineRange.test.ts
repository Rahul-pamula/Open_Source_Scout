import test from 'node:test';
import assert from 'node:assert';
import { applyStringEdit } from './editor.js';

test('Editor Line-Range Bounded Replacement Suite', async (t) => {
  await t.test('disambiguates identical function headers by constraining line range', () => {
    const code = [
      '// Module Alpha',
      'export function handler() {',
      '  return "alpha";',
      '}',
      '',
      '// Module Beta',
      'export function handler() {',
      '  return "beta";',
      '}',
    ].join('\n');

    // Trying to replace 'export function handler() {' without line range should fail as ambiguous
    assert.throws(
      () => applyStringEdit(code, { search: 'export function handler() {', replace: 'export function betaHandler() {' }),
      /Ambiguous match: found 2 occurrences/
    );

    // Bounding to lines 6-9 targets only Module Beta
    const updated = applyStringEdit(code, {
      search: 'export function handler() {',
      replace: 'export function betaHandler() {',
      startLine: 6,
      endLine: 9,
    });

    assert.ok(updated.includes('// Module Alpha\nexport function handler() {'));
    assert.ok(updated.includes('// Module Beta\nexport function betaHandler() {'));
  });

  await t.test('accurately replaces multi-line block within bounded range', () => {
    const code = [
      'const a = 1;',
      'const b = 2;',
      'const c = 3;',
      'const d = 4;',
    ].join('\n');

    const updated = applyStringEdit(code, {
      search: 'const b = 2;\nconst c = 3;',
      replace: 'const b = 200;\nconst c = 300;\nconst c2 = 350;',
      startLine: 2,
      endLine: 3,
    });

    const lines = updated.split('\n');
    assert.strictEqual(lines[0], 'const a = 1;');
    assert.strictEqual(lines[1], 'const b = 200;');
    assert.strictEqual(lines[2], 'const c = 300;');
    assert.strictEqual(lines[3], 'const c2 = 350;');
    assert.strictEqual(lines[4], 'const d = 4;');
  });

  await t.test('rejects replacement when search target extends outside the specified line range', () => {
    const code = [
      'line 1',
      'line 2',
      'line 3',
      'line 4',
    ].join('\n');

    assert.throws(
      () =>
        applyStringEdit(code, {
          search: 'line 2\nline 3',
          replace: 'replacement',
          startLine: 1,
          endLine: 2, // ends before line 3
        }),
      /Search string not found within specified line range/
    );
  });
});
