/**
 * Editor utilities for Scout MCP edit_file tool.
 */

export interface EditOptions {
  search: string;
  replace: string;
  replaceAll?: boolean;
}

/**
 * Counts non-overlapping occurrences of search string within content.
 */
export function countOccurrences(content: string, search: string): number {
  if (!search) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = content.indexOf(search, pos)) !== -1) {
    count++;
    pos += search.length;
  }
  return count;
}

/**
 * Applies search and replace to file content with ambiguity detection.
 */
export function applyStringEdit(content: string, options: EditOptions): string {
  const { search, replace, replaceAll = false } = options;
  if (!content.includes(search)) {
    throw new Error('Search string not found in file.');
  }

  const occurrences = countOccurrences(content, search);
  if (occurrences > 1 && !replaceAll) {
    throw new Error(
      `Ambiguous match: found ${occurrences} occurrences of search string. Provide more context to make the match unique.`,
    );
  }

  if (replaceAll) {
    return content.split(search).join(replace);
  }

  return content.replace(search, replace);
}
