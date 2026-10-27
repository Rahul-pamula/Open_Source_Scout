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
 * Detects whether content predominantly uses CRLF (\r\n) or LF (\n).
 */
export function detectEol(content: string): '\r\n' | '\n' {
  const crlfMatches = content.match(/\r\n/g);
  const crlfCount = crlfMatches ? crlfMatches.length : 0;
  const lfMatches = content.match(/[^\r]\n/g);
  const lfCount = lfMatches ? lfMatches.length : 0;
  return crlfCount > lfCount ? '\r\n' : '\n';
}

/**
 * Normalizes all newlines in text to the target EOL string.
 */
export function normalizeEol(text: string, targetEol: '\r\n' | '\n'): string {
  return text.replace(/\r?\n/g, targetEol);
}

/**
 * Applies search and replace to file content with ambiguity detection, line-range targeting, and EOL normalization.
 */
/**
 * Searches for a unique match ignoring leading/trailing indentation and inner whitespace differences.
 */
export function findFuzzyWhitespaceMatch(
  content: string,
  search: string,
): { start: number; end: number } | null {
  const eol = detectEol(content);
  const contentLines = content.split(eol);
  const searchLines = search.split(/\r?\n/).map((l) => l.trim().replace(/[ \t]+/g, ' '));

  if (searchLines.length === 0 || searchLines.every((l) => l === '')) return null;

  const matches: Array<{ startLine: number; endLine: number }> = [];

  for (let i = 0; i <= contentLines.length - searchLines.length; i++) {
    let matched = true;
    for (let j = 0; j < searchLines.length; j++) {
      const cLineNorm = contentLines[i + j].trim().replace(/[ \t]+/g, ' ');
      if (cLineNorm !== searchLines[j]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      matches.push({ startLine: i, endLine: i + searchLines.length - 1 });
    }
  }

  if (matches.length === 1) {
    const { startLine, endLine } = matches[0];
    const searchHasTrailingNewline = search.endsWith('\n') || search.endsWith('\r');
    let offset = 0;
    for (let i = 0; i < startLine; i++) {
      offset += contentLines[i].length + eol.length;
    }
    let endOffset = offset;
    for (let i = startLine; i <= endLine; i++) {
      endOffset += contentLines[i].length;
      if (i < endLine) {
        endOffset += eol.length;
      }
    }
    if (searchHasTrailingNewline && endLine < contentLines.length - 1) {
      endOffset += eol.length;
    }
    return { start: offset, end: endOffset };
  } else if (matches.length > 1) {
    throw new Error(
      `Ambiguous match: found ${matches.length} occurrences matching with flexible whitespace. Provide more context to make the match unique.`,
    );
  }

  return null;
}

/**
 * Applies search and replace to file content with ambiguity detection, line-range targeting, and EOL normalization.
 */
export function applyStringEdit(content: string, options: EditOptions): string {
  const fileEol = detectEol(content);
  const rawSearch = options.search;
  const rawReplace = options.replace;

  // Normalize search and replace newlines to match target file EOL
  const search = normalizeEol(rawSearch, fileEol);
  const replace = normalizeEol(rawReplace, fileEol);
  const { replaceAll = false, startLine, endLine } = options;

  // Handle line range targeting
  if (startLine !== undefined || endLine !== undefined) {
    const eol = fileEol;
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
      const fuzzy = findFuzzyWhitespaceMatch(targetBlock, search);
      if (fuzzy) {
        const modifiedBlock = targetBlock.slice(0, fuzzy.start) + replace + targetBlock.slice(fuzzy.end);
        const modifiedLines = modifiedBlock.split(eol);
        lines.splice(actualStart - 1, actualEnd - actualStart + 1, ...modifiedLines);
        return lines.join(eol);
      }
      throw new Error(`Search string not found within specified line range [${actualStart}, ${actualEnd}].`);
    }

    const modifiedBlock = applyStringEdit(targetBlock, { search, replace, replaceAll });
    const modifiedLines = modifiedBlock.split(eol);

    lines.splice(actualStart - 1, actualEnd - actualStart + 1, ...modifiedLines);
    return lines.join(eol);
  }

  if (!content.includes(search)) {
    const fuzzy = findFuzzyWhitespaceMatch(content, search);
    if (fuzzy) {
      return content.slice(0, fuzzy.start) + replace + content.slice(fuzzy.end);
    }
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

/**
 * Generates a unified diff representing modifications between oldContent and newContent.
 */
export function generateUnifiedDiff(filePath: string, oldContent: string, newContent: string): string {
  if (oldContent === newContent) return '';
  const oldLines = oldContent.split(/\r?\n/);
  const newLines = newContent.split(/\r?\n/);

  // Find first difference line
  let start = 0;
  while (start < oldLines.length && start < newLines.length && oldLines[start] === newLines[start]) {
    start++;
  }

  // Find trailing identical lines
  let oldEnd = oldLines.length - 1;
  let newEnd = newLines.length - 1;
  while (oldEnd >= start && newEnd >= start && oldLines[oldEnd] === newLines[newEnd]) {
    oldEnd--;
    newEnd--;
  }

  // 3 lines of context
  const contextBefore = Math.max(0, start - 3);
  const oldContextEnd = Math.min(oldLines.length, oldEnd + 4);
  const newContextEnd = Math.min(newLines.length, newEnd + 4);

  const cleanPath = filePath.replace(/^[\\/]+/, '');
  const header = `--- a/${cleanPath}\n+++ b/${cleanPath}\n`;
  const hunkHeader = `@@ -${contextBefore + 1},${oldContextEnd - contextBefore} +${contextBefore + 1},${newContextEnd - contextBefore} @@\n`;

  const lines: string[] = [];
  for (let i = contextBefore; i < start; i++) {
    lines.push(` ${oldLines[i]}`);
  }
  for (let i = start; i <= oldEnd; i++) {
    lines.push(`-${oldLines[i]}`);
  }
  for (let i = start; i <= newEnd; i++) {
    lines.push(`+${newLines[i]}`);
  }
  for (let i = oldEnd + 1; i < oldContextEnd; i++) {
    lines.push(` ${oldLines[i]}`);
  }

  return header + hunkHeader + lines.join('\n') + '\n';
}

