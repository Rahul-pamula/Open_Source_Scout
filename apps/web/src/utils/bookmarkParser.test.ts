import { describe, test } from 'node:test';
import assert from 'node:assert';
import { parseBookmarkHtml } from './bookmarkParser';

/** Closes #817: Bookmark HTML import parser test suite */
describe('parseBookmarkHtml', () => {
  test('parses browser bookmark folders and valid links', () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <TITLE>Bookmarks</TITLE>
      <H1>Bookmarks</H1>
      <DL><p>
        <DT><H3>Engineering Ops</H3>
        <DL><p>
          <DT><A HREF="https://app.clickup.com/123">ClickUp Board</A>
          <DT><A HREF="https://docs.google.com/spec">Spec Document</A>
        </DL><p>
      </DL><p>
    `;
    const results = parseBookmarkHtml(html);
    assert.strictEqual(results.length, 2);
    assert.strictEqual(results[0].title, 'ClickUp Board');
    assert.strictEqual(results[0].folder, 'Engineering Ops');
    assert.strictEqual(results[1].url, 'https://docs.google.com/spec');
  });
});
