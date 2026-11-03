/**
 * Open Source Scout - Multi-Tier Favicon & Domain Metadata Engine
 *
 * Automatically resolves high-resolution icons (128px) for internal and external web applications.
 * Tier 1: Google S2 Favicon API (128px high-res icons)
 * Tier 2: DuckDuckGo Icon Resolver
 * Tier 3: Monogram Generator for fallback squircle tiles
 */

export interface FaviconHierarchy {
  domain: string;
  normalizedUrl: string;
  googleS2Url: string;
  duckDuckGoUrl: string;
  monogram: string;
}

/**
 * Normalizes an arbitrary web URL: trims whitespace and guarantees http/https protocol.
 */
export function normalizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Extracts a clean domain hostname from any URL string, stripping 'www.', port, path, query, and hash.
 */
export function extractDomain(url: string): string {
  if (!url || typeof url !== 'string') return '';
  try {
    const normalized = normalizeUrl(url);
    const parsed = new URL(normalized);
    let hostname = parsed.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }
    // Must contain a dot or be localhost to be a valid domain
    if (!hostname.includes('.') && hostname !== 'localhost') {
      return '';
    }
    return hostname;
  } catch {
    // Fallback regex extraction for malformed or loose strings
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    return match ? match[1].toLowerCase() : '';
  }
}

/**
 * Generates high-resolution Google S2 favicon service URL (supports up to 128px).
 * Uses Google's social client endpoint for crisp high-density retina display icons.
 */
export function getGoogleS2FaviconUrl(urlOrDomain: string, size: number = 128): string {
  const domain = extractDomain(urlOrDomain);
  if (!domain) return '';
  const targetUrl = `https://${domain}`;
  return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(targetUrl)}&size=${size}`;
}

/**
 * Generates DuckDuckGo favicon service URL as a reliable secondary fallback.
 */
export function getDuckDuckGoFaviconUrl(urlOrDomain: string): string {
  const domain = extractDomain(urlOrDomain);
  if (!domain) return '';
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
}

/**
 * Generates an uppercase 1-2 character monogram string for fallback squircle rendering.
 */
export function generateMonogram(titleOrDomain: string): string {
  if (!titleOrDomain || typeof titleOrDomain !== 'string') return '?';
  const clean = titleOrDomain.trim();
  if (!clean) return '?';

  // If title has multiple words (e.g. "Google Docs" -> "GD")
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const first = words[0][0];
    const second = words[1][0];
    if (first && second) {
      return (first + second).toUpperCase();
    }
  }

  // Single word or domain (e.g. "ClickUp" -> "CL" or "github.com" -> "GI")
  const stripped = clean.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/[^a-zA-Z0-9]/g, '');
  if (stripped.length >= 2) {
    return stripped.slice(0, 2).toUpperCase();
  }
  return clean.slice(0, 1).toUpperCase();
}

/**
 * Resolves the complete multi-tier favicon hierarchy and metadata for a given URL and title.
 */
export function resolveFaviconHierarchy(url: string, title?: string): FaviconHierarchy {
  const normalized = normalizeUrl(url);
  const domain = extractDomain(normalized);
  const effectiveTitle = title && title.trim() ? title : domain || 'App';

  return {
    domain,
    normalizedUrl: normalized,
    googleS2Url: getGoogleS2FaviconUrl(domain, 128),
    duckDuckGoUrl: getDuckDuckGoFaviconUrl(domain),
    monogram: generateMonogram(effectiveTitle),
  };
}
