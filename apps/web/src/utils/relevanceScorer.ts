import type { IssueScoringTarget } from '../types/relevance';
import type { ExperienceLevel } from '../types/user';
import { getTopicSynonyms } from './topicSynonyms';

/**
 * Calculates technology and framework match score S_tech in range [0, maxWeight] (default 25).
 * Matches user's frameworks/tools against repository topics, labels, and issue text.
 */
export function calculateTechScore(
  target: IssueScoringTarget,
  userFrameworks: string[],
  maxWeight = 25,
): number {
  if (!userFrameworks || userFrameworks.length === 0) return 0;

  const validFrameworks = userFrameworks.map((f) => f.trim().toLowerCase()).filter(Boolean);

  if (validFrameworks.length === 0) return 0;

  const repoTopics = (target.repository_topics || []).map((t) => t.toLowerCase());
  const rawLabels = (target.labels || [])
    .map((l) => (typeof l === 'string' ? l : l.name || ''))
    .filter(Boolean);
  const normalizedLabels = rawLabels.map((l) => l.toLowerCase());
  const textContent = `${target.title || ''} ${(target.body || '').slice(0, 500)}`.toLowerCase();

  let matchedFrameworkCount = 0;

  for (const framework of validFrameworks) {
    const synonyms = getTopicSynonyms(framework);
    const hasMatch = synonyms.some((synonym) => {
      // Topic match
      if (repoTopics.includes(synonym)) return true;
      // Label match
      if (normalizedLabels.some((lbl) => lbl.includes(synonym))) return true;
      // Text mention match
      const regex = new RegExp(`\\b${synonym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(textContent);
    });

    if (hasMatch) {
      matchedFrameworkCount++;
    }
  }

  if (matchedFrameworkCount >= 2) {
    return maxWeight;
  } else if (matchedFrameworkCount === 1) {
    return Math.round(maxWeight * 0.75); // e.g. 19 pts
  }

  return 0;
}

/**
 * Calculates recency and fresh activity score S_recency in range [0, maxWeight] (default 15).
 * Rewards active, freshly updated issues and penalizes abandoned ones.
 */
export function calculateRecencyScore(
  target: IssueScoringTarget,
  referenceDate: Date = new Date(),
  maxWeight = 15,
): number {
  const dateStr = target.updated_at || target.created_at;
  if (!dateStr) return 0;

  const issueDate = new Date(dateStr);
  if (isNaN(issueDate.getTime())) return 0;

  const diffMs = referenceDate.getTime() - issueDate.getTime();
  if (diffMs < 0) return maxWeight;

  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 7) {
    return maxWeight;
  } else if (diffDays <= 30) {
    return Math.round(maxWeight * 0.8);
  } else if (diffDays <= 90) {
    return Math.round(maxWeight * 0.5);
  } else if (diffDays <= 180) {
    return Math.round(maxWeight * 0.25);
  }

  return 0;
}

/**
 * Calculates competition and opportunity accessibility score S_competition in range [0, maxWeight] (default 15).
 * Rewards issues with fewer comments where contributor claims are open.
 */
export function calculateCompetitionScore(target: IssueScoringTarget, maxWeight = 15): number {
  if (target.comments === undefined || target.comments === null || isNaN(target.comments)) {
    return Math.round(maxWeight * 0.7); // neutral fallback ~11 pts
  }

  const count = Math.max(0, target.comments);

  if (count === 0) {
    return maxWeight;
  } else if (count === 1) {
    return Math.round(maxWeight * 0.85);
  } else if (count === 2) {
    return Math.round(maxWeight * 0.65);
  } else if (count <= 5) {
    return Math.round(maxWeight * 0.4);
  }

  return Math.round(maxWeight * 0.15);
}

/**
 * Calculates difficulty alignment score S_difficulty in range [0, maxWeight] (default 10).
 * Matches user's experience tier against issue difficulty indicators.
 */
export function calculateDifficultyScore(
  target: IssueScoringTarget,
  experienceLevel: ExperienceLevel | string | null | undefined,
  maxWeight = 10,
): number {
  const level = experienceLevel || 'Beginner';

  const rawLabels = (target.labels || [])
    .map((l) => (typeof l === 'string' ? l : l.name || ''))
    .filter(Boolean);
  const labelsText = rawLabels.join(' ').toLowerCase();
  const titleText = (target.title || '').toLowerCase();
  const combinedMarkers = `${labelsText} ${titleText}`;

  const isEntryLevel =
    /good.first.issue|beginner|starter|easy|first-timers-only|up-for-grabs/i.test(combinedMarkers);
  const isAdvancedLevel =
    /architecture|rfc|security|performance|hard|expert|complex|breaking.change/i.test(
      combinedMarkers,
    );
  const isIntermediateLevel = /help.wanted|enhancement|feature|bug/i.test(combinedMarkers);

  if (level === 'Beginner') {
    if (isEntryLevel) return maxWeight;
    if (isIntermediateLevel) return Math.round(maxWeight * 0.7);
    if (isAdvancedLevel) return Math.round(maxWeight * 0.2);
    return Math.round(maxWeight * 0.5);
  }

  if (level === 'Intermediate') {
    if (isIntermediateLevel && !isEntryLevel) return maxWeight;
    if (isEntryLevel) return Math.round(maxWeight * 0.6);
    if (isAdvancedLevel) return Math.round(maxWeight * 0.7);
    return Math.round(maxWeight * 0.8);
  }

  // Senior
  if (isAdvancedLevel) return maxWeight;
  if (isEntryLevel) return Math.round(maxWeight * 0.3);
  return Math.round(maxWeight * 0.85);
}

/**
 * Calculates penalty deductions P_penalties (>= 0).
 * Penalizes stale repos, excessive comment clutter, and invalid/wontfix issues.
 */
export function calculatePenalties(
  target: IssueScoringTarget,
  referenceDate: Date = new Date(),
): number {
  let penalty = 0;

  // 1. Wontfix / Invalid / Stale label penalties
  const rawLabels = (target.labels || [])
    .map((l) => (typeof l === 'string' ? l : l.name || ''))
    .filter(Boolean);
  const labelsText = rawLabels.join(' ').toLowerCase();
  const titleText = (target.title || '').toLowerCase();
  const combinedMarkers = `${labelsText} ${titleText}`;

  if (/wontfix|won't fix|invalid|duplicate|stale/i.test(combinedMarkers)) {
    penalty += 50;
  }

  // 2. Stale repo inactivity > 365 days
  if (target.last_repo_activity_date) {
    const activityDate = new Date(target.last_repo_activity_date);
    if (!isNaN(activityDate.getTime())) {
      const diffDays = (referenceDate.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 365) {
        penalty += 25;
      }
    }
  }

  // 3. Extreme discussion clutter (> 25 comments on open issue)
  if (typeof target.comments === 'number' && target.comments > 25) {
    penalty += 10;
  }

  return penalty;
}

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
