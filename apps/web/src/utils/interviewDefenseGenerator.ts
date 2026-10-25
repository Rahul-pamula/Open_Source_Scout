import type { NormalizedIssue } from '../types';
import type { UserProfile } from '../types/user';
import type { RelevanceScoreBreakdown } from '../types/relevance';

export interface InterviewDefenseStrategy {
  headline: string;
  elevatorPitch: string;
  talkingPoints: string[];
  technicalKeywords: string[];
}

/**
 * Generates structured talking points and defense arguments for a developer
 * to articulate why they chose this specific issue and how it matches their background.
 */
export function generateInterviewDefense(
  issue: NormalizedIssue | null,
  profile: UserProfile | null,
  breakdown: RelevanceScoreBreakdown | null,
): InterviewDefenseStrategy {
  if (!issue) {
    return {
      headline: 'Issue Selection Rationale',
      elevatorPitch:
        'I target open-source issues that strategically demonstrate core engineering fundamentals and clean architectural problem solving.',
      talkingPoints: [
        'Proactively selected high-signal tasks aligned with maintainer priorities.',
        'Focused on clean testing and deterministic execution.',
      ],
      technicalKeywords: [],
    };
  }

  const primaryLang = profile?.skills?.[0] || issue.language || 'modern software';
  const repoName = issue.repoName || (issue.url ? issue.url.split('/')[4] : 'open source project');
  const issueNumber = issue.url?.match(/\/issues\/(\d+)/)?.[1] || issue.id || 'issue';
  const level = profile?.experience_level || 'Intermediate';

  const headline = `Defending ${issue.title} in Interviews`;

  const elevatorPitch = `In ${repoName}, I identified and resolved #${issueNumber} using ${primaryLang}. I specifically targeted this issue because it directly demonstrates ${level}-tier proficiency in production debugging, maintainer collaboration, and clean unit testing.`;

  const talkingPoints: string[] = [
    `Targeted Domain Alignment: Selected because the codebase leverages ${primaryLang}, matching my hands-on experience and allowing immediate velocity without onboarding friction.`,
    `Algorithmic Selection: Evaluated via Scout's 100-point relevance engine (Scored ${breakdown ? breakdown.total : 85}/100), ensuring fresh maintainer activity and high architectural impact.`,
    `Maintainer Empathy: Kept scope isolated and surgical, preserving existing codebase architecture and guaranteeing zero regressions with thorough unit test coverage.`,
    `Production Readiness: Prepared clean reproduction steps, git commit safety, and transparent documentation for the pull request review.`,
  ];

  const technicalKeywords: string[] = [
    primaryLang,
    level,
    ...(issue.labels || []).slice(0, 3),
  ].filter(Boolean);

  return {
    headline,
    elevatorPitch,
    talkingPoints,
    technicalKeywords,
  };
}
