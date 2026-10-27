/**
 * Editor utilities for Scout MCP edit_file tool.
 */

export interface EditOptions {
  search: string;
  replace: string;
  replaceAll?: boolean;
  startLine?: number;
  endLine?: number;
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
 * Applies search and replace to file content with ambiguity detection and optional line-range targeting.
 */
export function applyStringEdit(content: string, options: EditOptions): string {
  const { search, replace, replaceAll = false, startLine, endLine } = options;

  // Handle line range targeting
  if (startLine !== undefined || endLine !== undefined) {
    const eol = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(eol);
    const totalLines = lines.length;

    const actualStart = startLine !== undefined ? Math.max(1, startLine) : 1;
    const actualEnd = endLine !== undefined ? Math.min(totalLines, endLine) : totalLines;

    if (actualStart > actualEnd) {
      throw new Error(`Invalid line range: start_line (${actualStart}) exceeds end_line (${actualEnd}).`);
    }

    const targetLines = lines.slice(actualStart - 1, actualEnd);
    const targetBlock = targetLines.join(eol);

    if (!targetBlock.includes(search)) {
      throw new Error(`Search string not found within specified line range [${actualStart}, ${actualEnd}].`);
    }

    const modifiedBlock = applyStringEdit(targetBlock, { search, replace, replaceAll });
    const modifiedLines = modifiedBlock.split(eol);

    lines.splice(actualStart - 1, actualEnd - actualStart + 1, ...modifiedLines);
    return lines.join(eol);
  }

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
