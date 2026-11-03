export function normalizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function extractDomain(url: string): string {
  if (!url || typeof url !== 'string') return '';
  try {
    const normalized = normalizeUrl(url);
    const parsed = new URL(normalized);
    let hostname = parsed.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }
    if (!hostname.includes('.') && hostname !== 'localhost') {
      return '';
    }
    return hostname;
  } catch {
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    return match ? match[1].toLowerCase() : '';
  }
}

export function getGoogleS2FaviconUrl(urlOrDomain: string, size: number = 128): string {
  const domain = extractDomain(urlOrDomain);
  if (!domain) return '';
  const targetUrl = `https://${domain}`;
  return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(targetUrl)}&size=${size}`;
}

export function getDuckDuckGoFaviconUrl(urlOrDomain: string): string {
  const domain = extractDomain(urlOrDomain);
  if (!domain) return '';
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
}

export function generateMonogram(titleOrDomain: string): string {
  if (!titleOrDomain || typeof titleOrDomain !== 'string') return '?';
  const clean = titleOrDomain.trim();
  if (!clean) return '?';

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const first = words[0][0];
    const second = words[1][0];
    if (first && second) return (first + second).toUpperCase();
  }

  const stripped = clean.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/[^a-zA-Z0-9]/g, '');
  if (stripped.length >= 2) {
    return stripped.slice(0, 2).toUpperCase();
  }
  return clean.slice(0, 1).toUpperCase();
}
