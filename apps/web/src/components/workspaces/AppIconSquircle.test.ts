import { describe, test } from 'node:test';
import assert from 'node:assert';
import { getInitialsSquircleData, getNextFallbackUrl } from '../../utils/faviconResolver';

/** Closes #807: AppIconSquircle unit and interaction tests */
describe('AppIconSquircle aesthetics & fallback', () => {
  test('derives two-letter initials and palette background', () => {
    const data = getInitialsSquircleData('ClickUp Dashboard');
    assert.strictEqual(data.initials, 'CD');
    assert.ok(data.bgColor.startsWith('#'));
  });

  test('cascades through fallback urls on load errors', () => {
    const tier0 = getNextFallbackUrl('github.com', 0);
    const tier1 = getNextFallbackUrl('github.com', 1);
    const tier2 = getNextFallbackUrl('github.com', 2);
    const tier3 = getNextFallbackUrl('github.com', 3);
    assert.ok(tier0 && tier0.includes('t1.gstatic.com'));
    assert.ok(tier1 && tier1.includes('unavatar.io'));
    assert.ok(tier2 && tier2.includes('duckduckgo.com'));
    assert.strictEqual(tier3, null);
  });
});
