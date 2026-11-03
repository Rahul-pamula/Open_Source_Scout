import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractDomain,
  normalizeUrl,
  getGoogleS2FaviconUrl,
  getDuckDuckGoFaviconUrl,
  generateMonogram,
  resolveFaviconHierarchy,
} from './faviconResolver.ts';

describe('faviconResolver - Multi-Tier Favicon & Domain Engine', () => {
  describe('normalizeUrl', () => {
    it('prepends https:// when protocol is missing', () => {
      assert.equal(normalizeUrl('github.com'), 'https://github.com');
      assert.equal(normalizeUrl('clickup.com/home'), 'https://clickup.com/home');
    });

    it('preserves existing https:// and http:// protocols', () => {
      assert.equal(normalizeUrl('https://docs.google.com'), 'https://docs.google.com');
      assert.equal(normalizeUrl('http://localhost:3000'), 'http://localhost:3000');
    });

    it('trims whitespace and handles empty strings', () => {
      assert.equal(normalizeUrl('   https://linear.app   '), 'https://linear.app');
      assert.equal(normalizeUrl(''), '');
    });
  });

  describe('extractDomain', () => {
    it('extracts clean domain from standard https URLs', () => {
      assert.equal(extractDomain('https://github.com/Rahul-pamula'), 'github.com');
      assert.equal(extractDomain('https://app.clickup.com/123/dashboard?tab=1'), 'app.clickup.com');
    });

    it('strips www. prefix correctly', () => {
      assert.equal(extractDomain('https://www.notion.so/my-page'), 'notion.so');
      assert.equal(extractDomain('www.google.com'), 'google.com');
    });

    it('handles loose domain strings without protocol', () => {
      assert.equal(extractDomain('slack.com'), 'slack.com');
      assert.equal(extractDomain('sub.domain.company.co.uk/path'), 'sub.domain.company.co.uk');
    });

    it('returns empty string for invalid inputs', () => {
      assert.equal(extractDomain(''), '');
      assert.equal(extractDomain('not-a-valid-url'), '');
    });
  });

  describe('getGoogleS2FaviconUrl (Issue #775)', () => {
    it('builds 128px high-resolution Google S2 favicon service URL', () => {
      const url = getGoogleS2FaviconUrl('https://github.com/Rahul-pamula', 128);
      assert.ok(url.includes('t1.gstatic.com/faviconV2'));
      assert.ok(url.includes('client=SOCIAL'));
      assert.ok(url.includes('size=128'));
      assert.ok(url.includes(encodeURIComponent('https://github.com')));
    });

    it('allows custom sizes (e.g. 64px or 32px)', () => {
      const url = getGoogleS2FaviconUrl('linear.app', 64);
      assert.ok(url.includes('size=64'));
    });

    it('returns empty string if domain extraction fails', () => {
      assert.equal(getGoogleS2FaviconUrl(''), '');
    });
  });

  describe('getDuckDuckGoFaviconUrl', () => {
    it('builds valid DuckDuckGo fallback favicon URL', () => {
      const url = getDuckDuckGoFaviconUrl('https://app.clickup.com');
      assert.equal(url, 'https://icons.duckduckgo.com/ip3/app.clickup.com.ico');
    });
  });

  describe('generateMonogram', () => {
    it('extracts initials from multi-word app titles', () => {
      assert.equal(generateMonogram('Google Docs'), 'GD');
      assert.equal(generateMonogram('Internal HRMS Portal'), 'IH');
    });

    it('extracts first two letters from single word titles', () => {
      assert.equal(generateMonogram('ClickUp'), 'CL');
      assert.equal(generateMonogram('Figma'), 'FI');
      assert.equal(generateMonogram('Slack'), 'SL');
    });

    it('handles domains or URLs gracefully', () => {
      assert.equal(generateMonogram('https://github.com'), 'GI');
    });

    it('falls back to ? for empty input', () => {
      assert.equal(generateMonogram(''), '?');
    });
  });

  describe('resolveFaviconHierarchy', () => {
    it('assembles complete multi-tier hierarchy', () => {
      const hierarchy = resolveFaviconHierarchy('https://app.slack.com/client', 'Slack Workplace');
      assert.equal(hierarchy.domain, 'app.slack.com');
      assert.equal(hierarchy.normalizedUrl, 'https://app.slack.com/client');
      assert.ok(hierarchy.googleS2Url.includes('size=128'));
      assert.equal(hierarchy.duckDuckGoUrl, 'https://icons.duckduckgo.com/ip3/app.slack.com.ico');
      assert.equal(hierarchy.monogram, 'SW');
    });
  });
});
