/** Closes #815: URL protocol normalizer and XSS/malicious protocol sanitizer */
export function sanitizeWorkspaceUrl(rawUrl: string): {
  url: string;
  valid: boolean;
  error?: string;
} {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { url: '', valid: false, error: 'URL cannot be empty.' };
  }

  const trimmed = rawUrl.trim();
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return { url: '', valid: false, error: 'Disallowed protocol for security reasons.' };
  }

  try {
    let normalized = trimmed;
    if (!/^https?:\/\//i.test(trimmed)) {
      normalized = `https://${trimmed}`;
    }
    const parsed = new URL(normalized);
    if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') {
      return { url: '', valid: false, error: 'Invalid domain name.' };
    }
    return { url: parsed.toString(), valid: true };
  } catch {
    return { url: '', valid: false, error: 'Malformed URL format.' };
  }
}
