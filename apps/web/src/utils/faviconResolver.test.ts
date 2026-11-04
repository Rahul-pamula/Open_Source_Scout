import { describe, it, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractDomain,
  normalizeUrl,
  getGoogleS2FaviconUrl,
  getUnavatarUrl,
  getDuckDuckGoFaviconUrl,
  getNextFallbackUrl,
  getInitialsSquircleData,
} from './faviconResolver.ts';

/** Closes #782: URL normalization & domain extraction unit tests */
describe('faviconResolver - domain extraction and normalization', () => {
  it('normalizes URLs cleanly', () => {
    assert.equal(normalizeUrl('github.com'), 'https://github.com');
  });

  it('extracts canonical domain', () => {
    assert.equal(extractDomain('https://app.clickup.com/dashboard'), 'app.clickup.com');
  });

  test('validates presets and google s2 url format', () => {
    assert.strictEqual(extractDomain('https://app.clickup.com/123'), 'app.clickup.com');
    assert.strictEqual(normalizeUrl('github.com'), 'https://github.com');
    const s2 = getGoogleS2FaviconUrl('github.com');
    assert.ok(s2.includes('t1.gstatic.com'));
  });
});

/** Closes #783: Multi-tier fallback cascade integration test */
describe('Multi-tier fallback cascade integration', () => {
  test('tests multi-tier fallback cascade', () => {
    const tier0 = getNextFallbackUrl('linear.app', 0);
    const tier1 = getNextFallbackUrl('linear.app', 1);
    const tier2 = getNextFallbackUrl('linear.app', 2);
    const tier3 = getNextFallbackUrl('linear.app', 3);
    assert.ok(tier0 && tier0.includes('t1.gstatic.com'));
    assert.ok(tier1 && tier1.includes('unavatar.io'));
    assert.ok(tier2 && tier2.includes('duckduckgo.com'));
    assert.strictEqual(tier3, null);
    const initials = getInitialsSquircleData('linear.app');
    assert.strictEqual(initials.initials.length, 2);
  });
});

describe('Google S2 Favicon API', () => {
  it('builds 128px high-res Google S2 favicon URL', () => {
    const url = getGoogleS2FaviconUrl('github.com', 128);
    assert.ok(url.includes('t1.gstatic.com/faviconV2'));
    assert.ok(url.includes('size=128'));
  });
});
