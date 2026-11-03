import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractDomain, normalizeUrl } from './faviconResolver.ts';

describe('faviconResolver - domain extraction', () => {
  it('normalizes URLs cleanly', () => {
    assert.equal(normalizeUrl('github.com'), 'https://github.com');
  });

  it('extracts canonical domain', () => {
    assert.equal(extractDomain('https://app.clickup.com/dashboard'), 'app.clickup.com');
  });
});
