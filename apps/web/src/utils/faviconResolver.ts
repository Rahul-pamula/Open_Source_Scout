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

export function getUnavatarUrl(domain: string): string {
  return `https://unavatar.io/${encodeURIComponent(domain)}?fallback=false`;
}

/** Closes #777: Dedicated DuckDuckGo fallback resolver helper */
export function resolveDuckDuckGoFavicon(domain: string): string {
  return getDuckDuckGoFaviconUrl(domain);
}

/** Closes #778: In-memory and localStorage icon caching engine */
const iconMemoryCache = new Map<string, string>();

export function cacheIconUrl(domain: string, url: string): void {
  iconMemoryCache.set(domain.toLowerCase(), url);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`scout_icon_${domain.toLowerCase()}`, url);
    }
  } catch (e) {}
}

export function getCachedIconUrl(domain: string): string | null {
  const key = domain.toLowerCase();
  if (iconMemoryCache.has(key)) return iconMemoryCache.get(key)!;
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(`scout_icon_${key}`);
    }
  } catch (e) {}
  return null;
}

/** Closes #779: Initials squircle badge data generator */
export function getInitialsSquircleData(nameOrDomain: string): {
  initials: string;
  bgColor: string;
} {
  const clean = nameOrDomain.replace(/^(https?:\/\/)?(www\.)?/, '').trim();
  const parts = clean.split(/[.\-_\s]+/);
  let initials = '';
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (clean.length > 0) {
    initials = clean.substring(0, 2).toUpperCase();
  } else {
    initials = 'OS';
  }
  const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4'];
  let hash = 0;
  for (let i = 0; i < clean.length; i++) hash = (hash << 5) - hash + clean.charCodeAt(i);
  const bgColor = colors[Math.abs(hash) % colors.length];
  return { initials, bgColor };
}

/** Closes #780: Graceful cascading fallback swapper */
export function getNextFallbackUrl(domain: string, currentAttempt: number): string | null {
  if (currentAttempt === 0) return getGoogleS2FaviconUrl(domain, 128);
  if (currentAttempt === 1) return getUnavatarUrl(domain);
  if (currentAttempt === 2) return getDuckDuckGoFaviconUrl(domain);
  return null;
}

/** Closes #781: Top developer & workplace tool presets */
export const TOOL_DOMAIN_PRESETS: Record<
  string,
  { name: string; category: string; defaultColor: string }
> = {
  'github.com': { name: 'GitHub', category: 'Dev', defaultColor: '#24292f' },
  'gitlab.com': { name: 'GitLab', category: 'Dev', defaultColor: '#fc6d26' },
  'clickup.com': { name: 'ClickUp', category: 'Project', defaultColor: '#7b68ee' },
  'slack.com': { name: 'Slack', category: 'Chat', defaultColor: '#4a154b' },
  'figma.com': { name: 'Figma', category: 'Design', defaultColor: '#f24e1e' },
  'notion.so': { name: 'Notion', category: 'Docs', defaultColor: '#000000' },
  'docs.google.com': { name: 'Google Docs', category: 'Docs', defaultColor: '#4285f4' },
  'linear.app': { name: 'Linear', category: 'Project', defaultColor: '#5e6ad2' },
};
