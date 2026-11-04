import { describe, test } from 'node:test';
import assert from 'node:assert';
import { sanitizeWorkspaceUrl } from './urlSanitizer';

/** Closes #816: URL Sanitizer and AddLinkModal validation tests */
describe('sanitizeWorkspaceUrl validation & security', () => {
  test('prepends https and validates clean web URLs', () => {
    const res = sanitizeWorkspaceUrl('github.com');
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.url, 'https://github.com/');
  });

  test('blocks javascript: and dangerous XSS schemes', () => {
    const res = sanitizeWorkspaceUrl('javascript:alert(1)');
    assert.strictEqual(res.valid, false);
    assert.ok(res.error?.includes('Disallowed'));
  });
});
