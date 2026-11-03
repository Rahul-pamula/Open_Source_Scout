import { extractDomain, normalizeUrl, getGoogleS2FaviconUrl } from './faviconResolver.ts';

describe('faviconResolver - domain extraction', () => {
  it('normalizes URLs cleanly', () => {
    assert.equal(normalizeUrl('github.com'), 'https://github.com');
  });

  it('extracts canonical domain', () => {
    assert.equal(extractDomain('https://app.clickup.com/dashboard'), 'app.clickup.com');
  });
});

describe('Google S2 Favicon API', () => {
  it('builds 128px high-res Google S2 favicon URL', () => {
    const url = getGoogleS2FaviconUrl('github.com', 128);
    assert.ok(url.includes('t1.gstatic.com/faviconV2'));
    assert.ok(url.includes('size=128'));
  });
});
