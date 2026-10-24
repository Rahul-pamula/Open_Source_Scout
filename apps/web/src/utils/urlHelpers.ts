/**
 * Normalizes user-entered URL strings by trimming and adding https:// if missing.
 */
export function normalizeDocUrl(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Checks if a URL points to Google Docs, Google Drive, or Google Sheets.
 */
export function isValidGoogleDocsUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;

  const normalized = normalizeDocUrl(rawUrl);
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const host = parsed.hostname.toLowerCase();
    return (
      host === 'docs.google.com' ||
      host.endsWith('.docs.google.com') ||
      host === 'drive.google.com' ||
      host.endsWith('.drive.google.com')
    );
  } catch {
    return false;
  }
}

/**
 * Validates whether a string is any syntactically valid HTTP/HTTPS URL.
 */
export function isValidWebUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;

  const normalized = normalizeDocUrl(rawUrl);
  try {
    const parsed = new URL(normalized);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
