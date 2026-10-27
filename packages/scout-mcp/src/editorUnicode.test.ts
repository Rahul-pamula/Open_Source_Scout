import test from 'node:test';
import assert from 'node:assert';
import { applyStringEdit, hasUtf8Bom, stripUtf8Bom, restoreUtf8Bom, UTF8_BOM } from './editor.js';

test('Editor Unicode & UTF-8 BOM Preservation Suite', async (t) => {
  await t.test('detects, strips, and restores UTF-8 BOM', () => {
    const textWithBom = `${UTF8_BOM}const x = 1;`;
    const textWithoutBom = 'const x = 1;';

    assert.strictEqual(hasUtf8Bom(textWithBom), true);
    assert.strictEqual(hasUtf8Bom(textWithoutBom), false);

    assert.strictEqual(stripUtf8Bom(textWithBom), 'const x = 1;');
    assert.strictEqual(stripUtf8Bom(textWithoutBom), 'const x = 1;');

    assert.strictEqual(restoreUtf8Bom('const x = 2;', true), `${UTF8_BOM}const x = 2;`);
    assert.strictEqual(restoreUtf8Bom('const x = 2;', false), 'const x = 2;');
  });

  await t.test('seamlessly edits line 1 of a file with UTF-8 BOM and preserves BOM on output', () => {
    const fileWithBom = `${UTF8_BOM}import React from 'react';\nexport const App = () => null;\n`;
    const search = "import React from 'react';";
    const replace = "import * as React from 'react';";

    const result = applyStringEdit(fileWithBom, { search, replace });
    assert.ok(result.startsWith(UTF8_BOM), 'Result must retain leading UTF-8 BOM');
    assert.ok(result.includes("import * as React from 'react';"));
  });

  await t.test('preserves multi-byte Unicode characters (emojis, CJK, accents)', () => {
    const fileContent = [
      '// Project 🚀 Scout: Open Source AI',
      'const greeting = "こんにちは、世界！"; // Japanese',
      'const message = "你好，世界！"; // Chinese',
      'const author = "René François Müller"; // Accents',
    ].join('\n');

    const search = 'const greeting = "こんにちは、世界！"; // Japanese';
    const replace = 'const greeting = "こんにちは、Scout！ 🌟"; // Japanese';

    const updated = applyStringEdit(fileContent, { search, replace });
    assert.ok(updated.includes('こんにちは、Scout！ 🌟'));
    assert.ok(updated.includes('René François Müller'));
    assert.ok(updated.includes('Project 🚀 Scout'));
  });
});
