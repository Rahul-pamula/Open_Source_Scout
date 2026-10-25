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

  const rawQuery = parts.join(' ').trim();
  return sanitizeGitHubQuery(rawQuery);
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

  const rawQuery = parts.join(' ').trim();
  return sanitizeGitHubQuery(rawQuery);
}

export const MAX_GITHUB_QUERY_LENGTH = 256;
export const MAX_LANGUAGE_QUALIFIERS = 5;

export interface QueryValidationResult {
  isValid: boolean;
  length: number;
  errors: string[];
}

/**
 * Validates a GitHub search query against GitHub Search API constraints:
 * - Query string must not exceed 256 characters.
 * - Language qualifiers should not exceed 5 items.
 */
export function validateGitHubQuery(query: string): QueryValidationResult {
  const errors: string[] = [];
  const clean = (query || '').trim();
  const length = clean.length;

  if (length === 0) {
    errors.push('Query cannot be empty');
  }

  if (length > MAX_GITHUB_QUERY_LENGTH) {
    errors.push(
      `Query length (${length}) exceeds maximum allowable GitHub search length of ${MAX_GITHUB_QUERY_LENGTH} characters`,
    );
  }

  const languageMatches = clean.match(/language:\S+/g) || [];
  if (languageMatches.length > MAX_LANGUAGE_QUALIFIERS) {
    errors.push(
      `Query specifies ${languageMatches.length} language qualifiers, exceeding limit of ${MAX_LANGUAGE_QUALIFIERS}`,
    );
  }

  return {
    isValid: errors.length === 0,
    length,
    errors,
  };
}

/**
 * Sanitizes a search query string to ensure it satisfies GitHub's length constraints,
 * consolidating excessive qualifiers if needed.
 */
export function sanitizeGitHubQuery(query: string, maxLength = MAX_GITHUB_QUERY_LENGTH): string {
  if (!query) return '';
  let clean = query.replace(/\s+/g, ' ').trim();

  if (clean.length <= maxLength) {
    return clean;
  }

  // If query is overly long, iteratively prune secondary language qualifiers
  const tokens = clean.split(' ');
  while (clean.length > maxLength && tokens.length > 3) {
    // Drop the token before the last sort token
    tokens.splice(tokens.length - 2, 1);
    clean = tokens.join(' ');
  }

  return clean.slice(0, maxLength).trim();
}
