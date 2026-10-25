import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Phase 1 imports
import { normalizeExperienceLevel, type UserProfile } from '../types/user';

// Phase 2 imports
import { classifySkills } from '../utils/skillClassifier';
import { buildGitHubSearchQuery } from '../utils/queryBuilder';

// Phase 3 imports
import { calculateRelevanceScore } from '../utils/relevanceScorer';
import type { IssueScoringTarget } from '../types/relevance';

// Phase 4 imports
import { generateInterviewDefense } from '../utils/interviewDefenseGenerator';
import { validateAndNormalizeNotesUrl } from '../services/interviewNotesService';
import { isValidGoogleDocsUrl } from '../utils/urlHelpers';
import type { NormalizedIssue } from '../types';

describe('Discovery to Defense Full 4-Phase Lifecycle Integration Test', () => {
  it('executes the full end-to-end developer journey seamlessly', () => {
    // -------------------------------------------------------------------------
    // PHASE 1: Profile & Experience Tier Calibration
    // -------------------------------------------------------------------------
    const rawTier = 'intermediate';
    const normalizedTier = normalizeExperienceLevel(rawTier);
    assert.strictEqual(normalizedTier, 'Intermediate');

    const profile: UserProfile = {
      bio: 'Fullstack engineer focused on high-performance React and Node microservices.',
      skills: ['TypeScript', 'React', 'Node.js', 'Docker', 'GraphQL'],
      github_handle: 'scout-contributor',
      automation_count_today: 3,
      last_automation_date: '2026-10-25',
      custom_comment_enabled: false,
      custom_comment_text: null,
      experience_level: normalizedTier,
    };

    assert.strictEqual(profile.experience_level, 'Intermediate');
    assert.ok(profile.skills.length >= 5);

    // -------------------------------------------------------------------------
    // PHASE 2: Skill Taxonomy Classification & GitHub Query Generation
    // -------------------------------------------------------------------------
    const taxonomy = classifySkills(profile.skills);
    assert.ok(taxonomy.languages.includes('TypeScript'));
    assert.ok(taxonomy.frameworks.includes('React'));

    const searchQuery = buildGitHubSearchQuery({
      languages: taxonomy.languages,
      experienceLevel: profile.experience_level,
      limitLanguages: 2,
    });

    assert.ok(searchQuery.includes('language:TypeScript'));
    assert.ok(searchQuery.includes('label:"help wanted"'));
    assert.ok(searchQuery.includes('is:issue'));
    assert.ok(searchQuery.includes('is:open'));

    // -------------------------------------------------------------------------
    // PHASE 3: 100-Point Mathematical Relevance Scoring Engine
    // -------------------------------------------------------------------------
    const mockIssue: NormalizedIssue = {
      id: 'issue-react-100',
      url: 'https://github.com/facebook/react/issues/29800',
      title: 'Fix race condition in concurrent React transitions with TypeScript',
      body: 'State updates during concurrent rendering throw unexpected hydration mismatch.',
      repoName: 'facebook/react',
      repoUrl: 'https://github.com/facebook/react',
      state: 'open',
      isAssigned: false,
      labels: ['bug', 'help wanted', 'react'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      commentsCount: 1,
      language: 'TypeScript',
      repositoryTopics: ['react', 'ui', 'typescript'],
    };

    const target: IssueScoringTarget = {
      title: mockIssue.title,
      body: mockIssue.body,
      labels: mockIssue.labels,
      language: mockIssue.language,
      repository_topics: mockIssue.repositoryTopics,
      updated_at: mockIssue.updatedAt,
      created_at: mockIssue.createdAt,
      comments: mockIssue.commentsCount,
    };

    const breakdown = calculateRelevanceScore(target, profile);

    assert.ok(breakdown.total >= 85, `Expected score >= 85, got ${breakdown.total}`);
    assert.strictEqual(breakdown.langScore, 35, 'Full 35 points for TypeScript match');
    assert.ok(breakdown.techScore >= 19, 'Matching React should award high tech score');
    assert.strictEqual(breakdown.recencyScore, 15, 'Updated today should award 15 points');
    assert.strictEqual(breakdown.competitionScore, 13, '1 comment should award 13 points');
    assert.strictEqual(
      breakdown.difficultyScore,
      10,
      'Intermediate with help wanted awards 10 points',
    );
    assert.strictEqual(breakdown.penalties, 0, 'No adverse flags');

    // -------------------------------------------------------------------------
    // PHASE 4: Evaluation Dossier Injection, Defense Talking Points & Notes
    // -------------------------------------------------------------------------
    const defense = generateInterviewDefense(mockIssue, profile, breakdown);

    assert.ok(defense.headline.includes(mockIssue.title));
    assert.ok(defense.elevatorPitch.includes('facebook/react'));
    assert.ok(defense.elevatorPitch.includes('#29800'));
    assert.ok(defense.elevatorPitch.includes('TypeScript'));
    assert.ok(defense.elevatorPitch.includes('Intermediate-tier'));

    assert.strictEqual(defense.talkingPoints.length, 4);
    assert.ok(defense.talkingPoints[0].includes('TypeScript'));
    assert.ok(defense.talkingPoints[1].includes(`${breakdown.total}/100`));

    // Preparation notes validation
    const candidateNotesUrl =
      'docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit';
    const validation = validateAndNormalizeNotesUrl(candidateNotesUrl);

    assert.strictEqual(validation.valid, true);
    assert.strictEqual(
      validation.normalizedUrl,
      'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
    );
    assert.strictEqual(isValidGoogleDocsUrl(validation.normalizedUrl), true);
  });
});
