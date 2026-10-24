import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDocUrl, isValidGoogleDocsUrl, isValidWebUrl } from './urlHelpers';

describe('urlHelpers', () => {
  describe('normalizeDocUrl', () => {
    it('returns empty string for empty input', () => {
      assert.equal(normalizeDocUrl(''), '');
      assert.equal(normalizeDocUrl('   '), '');
    });

    it('preserves existing https:// and http:// protocols', () => {
      assert.equal(
        normalizeDocUrl('https://docs.google.com/document/d/123'),
        'https://docs.google.com/document/d/123',
      );
      assert.equal(
        normalizeDocUrl('http://docs.google.com/document/d/123'),
        'http://docs.google.com/document/d/123',
      );
    });

    it('prepends https:// when protocol is missing', () => {
      assert.equal(
        normalizeDocUrl('docs.google.com/document/d/123'),
        'https://docs.google.com/document/d/123',
      );
    });

    it('trims leading and trailing whitespace', () => {
      assert.equal(
        normalizeDocUrl('   https://docs.google.com/document/d/123   '),
        'https://docs.google.com/document/d/123',
      );
    });
  });

  describe('isValidGoogleDocsUrl', () => {
    it('returns true for docs.google.com URLs', () => {
      assert.equal(isValidGoogleDocsUrl('https://docs.google.com/document/d/1a2b3c4d/edit'), true);
      assert.equal(isValidGoogleDocsUrl('docs.google.com/document/d/1a2b3c4d'), true);
      assert.equal(isValidGoogleDocsUrl('https://docs.google.com/spreadsheets/d/abc'), true);
    });

    it('returns true for drive.google.com URLs', () => {
      assert.equal(isValidGoogleDocsUrl('https://drive.google.com/file/d/xyz/view'), true);
      assert.equal(isValidGoogleDocsUrl('drive.google.com/drive/folders/folder-id'), true);
    });

    it('returns false for empty or non-string inputs', () => {
      assert.equal(isValidGoogleDocsUrl(''), false);
      assert.equal(isValidGoogleDocsUrl('   '), false);
      // @ts-expect-error test non-string
      assert.equal(isValidGoogleDocsUrl(null), false);
      // @ts-expect-error test non-string
      assert.equal(isValidGoogleDocsUrl(undefined), false);
    });

    it('returns false for other domains', () => {
      assert.equal(isValidGoogleDocsUrl('https://github.com/owner/repo'), false);
      assert.equal(isValidGoogleDocsUrl('https://notion.so/my-page'), false);
      assert.equal(isValidGoogleDocsUrl('https://google.com/search?q=docs'), false);
    });

    it('rejects unsafe protocols or malformed strings', () => {
      assert.equal(isValidGoogleDocsUrl('javascript:alert(1)'), false);
      assert.equal(isValidGoogleDocsUrl('ftp://docs.google.com'), false);
      assert.equal(isValidGoogleDocsUrl('not a url at all'), false);
    });
  });

  describe('isValidWebUrl', () => {
    it('returns true for standard http/https web URLs', () => {
      assert.equal(isValidWebUrl('https://example.com'), true);
      assert.equal(isValidWebUrl('http://localhost:3000'), true);
      assert.equal(isValidWebUrl('docs.google.com/document/d/123'), true);
    });

    it('returns false for empty, invalid, or non-web protocols', () => {
      assert.equal(isValidWebUrl(''), false);
      assert.equal(isValidWebUrl('file:///path/to/file'), false);
      assert.equal(isValidWebUrl('javascript:void(0)'), false);
    });
  });
});
