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

describe('Google S2 Favicon API', () => {
  it('builds 128px high-res Google S2 favicon URL', () => {
    const url = getGoogleS2FaviconUrl('github.com', 128);
    assert.ok(url.includes('t1.gstatic.com/faviconV2'));
    assert.ok(url.includes('size=128'));
  });
});
