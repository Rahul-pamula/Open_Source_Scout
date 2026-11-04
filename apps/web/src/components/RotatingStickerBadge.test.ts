import { describe, test } from 'node:test';
import assert from 'node:assert';
import { STICKER_SLIDES } from './RotatingStickerBadge';

/** Closes #850: RotatingStickerBadge test suite */
describe('RotatingStickerBadge headline slides', () => {
  test('has exactly 3 core marketing headlines', () => {
    assert.strictEqual(STICKER_SLIDES.length, 3);
  });

  test('contains 10x Open Source and 10x AI Model messages', () => {
    assert.ok(STICKER_SLIDES.some((s) => s.highlight.includes('OPEN SOURCE')));
    assert.ok(STICKER_SLIDES.some((s) => s.highlight.includes('AI MODEL')));
    assert.ok(STICKER_SLIDES.some((s) => s.highlight.includes('PASSWORDS')));
  });
});
