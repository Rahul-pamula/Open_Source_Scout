/** Closes #814: Netscape bookmark export HTML parser */
export interface ParsedBookmark {
  title: string;
  url: string;
  folder: string;
}

export function parseBookmarkHtml(html: string): ParsedBookmark[] {
  const results: ParsedBookmark[] = [];
  let currentFolder = 'Imported Bookmarks';

  const lines = html.split(/\r?\n/);
  for (const line of lines) {
    const h3Match = line.match(/<H3[^>]*>([^<]+)<\/H3>/i);
    if (h3Match) {
      currentFolder = h3Match[1].trim();
      continue;
    }

    const aMatch = line.match(/<A\s+[^>]*HREF="([^"]+)"[^>]*>([^<]*)<\/A>/i);
    if (aMatch) {
      const href = aMatch[1].trim();
      const title = aMatch[2].trim() || href;
      if (/^https?:\/\//i.test(href)) {
        results.push({
          title,
          url: href,
          folder: currentFolder,
        });
      }
    }
  }

  return results;
}
