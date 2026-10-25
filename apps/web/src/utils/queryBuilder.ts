import type { ExperienceLevel } from '../types/user';
import { normalizeExperienceLevel } from '../types/user';

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
