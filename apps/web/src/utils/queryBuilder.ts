import type { ExperienceLevel } from '../types/user';
import { normalizeExperienceLevel } from '../types/user';
import { classifySkills } from './skillClassifier';

export interface GitHubSearchQueryOptions {
  skills?: (string | null | undefined)[];
  experienceLevel?: ExperienceLevel | null;
  state?: 'open' | 'closed';
  sort?: string;
  limitLanguages?: number;
}

/**
 * Returns GitHub search query label qualifiers appropriate for the user's experience tier.
 * - Beginner: Targets entry-level issues marked "good first issue".
 * - Intermediate: Targets community-assistance issues marked "help wanted".
 * - Senior: Unrestricted issue scope (no restrictive entry label filter) allowing
 *   seniors to discover architectural, core feature, performance, and refactoring tickets.
 */
export function getLabelQualifiersForLevel(level?: ExperienceLevel | null): string[] {
  const normalized = normalizeExperienceLevel(level);

  switch (normalized) {
    case 'Beginner':
      return ['label:"good first issue"'];
    case 'Intermediate':
      return ['label:"help wanted"'];
    case 'Senior':
      return [];
    default:
      return ['label:"good first issue"'];
  }
}

/**
 * Constructs a syntactically valid GitHub issue search query string.
 * Combines state, experience tier labels, verified programming languages,
 * and sorting qualifiers.
 */
export function buildGitHubSearchQuery(options?: GitHubSearchQueryOptions): string {
  const state = options?.state ?? 'open';
  const parts: string[] = [`is:${state}`, 'is:issue'];

  // Experience level labels
  const labelQualifiers = getLabelQualifiersForLevel(options?.experienceLevel);
  if (labelQualifiers.length > 0) {
    parts.push(...labelQualifiers);
  }

  // Language qualifiers (only verified Linguist languages, preventing non-language syntax errors)
  const classified = classifySkills(options?.skills ?? []);
  const maxLangs = options?.limitLanguages ?? 3;
  const activeLanguages = classified.languages.slice(0, maxLangs);

  if (activeLanguages.length > 0) {
    for (const lang of activeLanguages) {
      parts.push(`language:${lang}`);
    }
  } else {
    // If no explicit languages provided, default to TypeScript
    parts.push('language:TypeScript');
  }

  // Sort order (defaults to sort:updated-desc for fresh issues)
  const sort = options?.sort ?? 'updated-desc';
  if (sort) {
    parts.push(`sort:${sort}`);
  }

  return parts.join(' ').trim();
}

/**
 * Constructs a broadened/relaxed GitHub search query used when a strict query
 * returns insufficient candidate issues (< 10 results or 0 results).
 * Relaxes strict label constraints and focuses on the primary prioritized language.
 */
export function buildRelaxedGitHubSearchQuery(options?: GitHubSearchQueryOptions): string {
  const state = options?.state ?? 'open';
  const parts: string[] = [`is:${state}`, 'is:issue'];

  // In relaxed mode, omit strict label constraints to maximize issue pool
  const classified = classifySkills(options?.skills ?? []);
  const primaryLanguage = classified.languages[0] || 'TypeScript';

  parts.push(`language:${primaryLanguage}`);

  const sort = options?.sort ?? 'updated-desc';
  if (sort) {
    parts.push(`sort:${sort}`);
  }

  return parts.join(' ').trim();
}
