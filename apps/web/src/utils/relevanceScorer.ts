import type { IssueScoringTarget } from '../types/relevance';

/**
 * Calculates language alignment score S_lang in range [0, maxWeight] (default 35).
 *
 * Logic:
 * 1. 100% of maxWeight (35 pts) if the repository/issue primary language matches any user language.
 * 2. 85% of maxWeight (~30 pts) if a user language is identified in the issue labels.
 * 3. 60% of maxWeight (~21 pts) if a user language is mentioned in the issue title or text.
 * 4. 0 pts if no language correlation is detected.
 */
export function calculateLanguageScore(
  target: IssueScoringTarget,
  userLanguages: string[],
  maxWeight = 35,
): number {
  if (!userLanguages || userLanguages.length === 0) return 0;

  const normalizedUserLangs = userLanguages.map((l) => l.trim().toLowerCase()).filter(Boolean);

  if (normalizedUserLangs.length === 0) return 0;

  // 1. Exact match on primary issue/repository language
  if (target.language) {
    const issueLang = target.language.trim().toLowerCase();
    if (normalizedUserLangs.includes(issueLang)) {
      return maxWeight;
    }
  }

  // 2. Check labels for language mentions
  const rawLabels = (target.labels || [])
    .map((l) => (typeof l === 'string' ? l : l.name || ''))
    .filter(Boolean);
  const normalizedLabels = rawLabels.map((l) => l.toLowerCase());

  for (const userLang of normalizedUserLangs) {
    if (normalizedLabels.some((lbl) => lbl.includes(userLang))) {
      return Math.round(maxWeight * 0.85);
    }
  }

  // 3. Text search fallback in title and description
  const textContent = `${target.title || ''} ${(target.body || '').slice(0, 500)}`.toLowerCase();
  for (const userLang of normalizedUserLangs) {
    const wordRegex = new RegExp(`\\b${userLang.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (wordRegex.test(textContent)) {
      return Math.round(maxWeight * 0.6);
    }
  }

  return 0;
}
