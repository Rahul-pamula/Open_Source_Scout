/**
 * Types and interfaces for the 100-Point Mathematical Relevance Scoring Engine.
 *
 * Scoring Formula:
 * Score = Clamp(0, 100, S_lang + S_tech + S_recency + S_competition + S_difficulty - P_penalties)
 */

export interface RelevanceScoreBreakdown {
  /** Language alignment score (0 - 35 points) */
  langScore: number;
  /** Technology, framework & topic match score (0 - 25 points) */
  techScore: number;
  /** Recency and fresh activity score (0 - 15 points) */
  recencyScore: number;
  /** Opportunity accessibility & comment competition score (0 - 15 points) */
  competitionScore: number;
  /** Developer experience level & difficulty match score (0 - 10 points) */
  difficultyScore: number;
  /** Deductions for stale repositories or adverse conditions */
  penalties: number;
  /** Final normalized aggregate relevance percentage (0 - 100) */
  total: number;
}

export interface ScoringWeights {
  languageWeight: number;
  techWeight: number;
  recencyWeight: number;
  competitionWeight: number;
  difficultyWeight: number;
}

export const DEFAULT_SCORING_WEIGHTS: Readonly<ScoringWeights> = {
  languageWeight: 35,
  techWeight: 25,
  recencyWeight: 15,
  competitionWeight: 15,
  difficultyWeight: 10,
} as const;

export interface IssueScoringTarget {
  title: string;
  body?: string | null;
  labels?: (string | { name?: string })[];
  language?: string | null;
  repository_topics?: string[];
  updated_at?: string | null;
  created_at?: string | null;
  comments?: number;
  last_repo_activity_date?: string | null;
}
