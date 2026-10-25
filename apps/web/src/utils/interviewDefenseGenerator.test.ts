import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateInterviewDefense } from './interviewDefenseGenerator';
import type { NormalizedIssue } from '../types';
import type { UserProfile } from '../types/user';
import type { RelevanceScoreBreakdown } from '../types/relevance';

describe('interviewDefenseGenerator unit tests', () => {
  const mockIssue: NormalizedIssue = {
    id: 'issue-101',
    url: 'https://github.com/facebook/react/issues/28540',
    title: 'Fix hydration error in Server Component streaming',
    body: 'Hydration fails when component suspends on server.',
    repoName: 'facebook/react',
    repoUrl: 'https://github.com/facebook/react',
    state: 'open',
    isAssigned: false,
    labels: ['bug', 'react', 'streaming'],
    createdAt: '2026-10-20T12:00:00Z',
    language: 'TypeScript',
  };

  const mockProfile: UserProfile = {
    bio: 'Frontend engineer with 3 years of React experience.',
    skills: ['TypeScript', 'React', 'Next.js'],
    github_handle: 'johndoe',
    automation_count_today: 0,
    last_automation_date: '2026-10-25',
    custom_comment_enabled: false,
    custom_comment_text: null,
    experience_level: 'Senior',
  };

  const mockBreakdown: RelevanceScoreBreakdown = {
    langScore: 35,
    techScore: 25,
    recencyScore: 15,
    competitionScore: 13,
    difficultyScore: 10,
    penalties: 0,
    total: 98,
  };

  it('generates rich, structured interview defense with full metadata', () => {
    const defense = generateInterviewDefense(mockIssue, mockProfile, mockBreakdown);

    assert.ok(defense.headline.includes(mockIssue.title));
    assert.ok(defense.elevatorPitch.includes('facebook/react'));
    assert.ok(defense.elevatorPitch.includes('#28540'));
    assert.ok(defense.elevatorPitch.includes('TypeScript'));
    assert.ok(defense.elevatorPitch.includes('Senior-tier'));

    assert.strictEqual(defense.talkingPoints.length, 4);
    assert.ok(defense.talkingPoints[0].includes('TypeScript'));
    assert.ok(defense.talkingPoints[1].includes('98/100'));

    assert.ok(defense.technicalKeywords.includes('TypeScript'));
    assert.ok(defense.technicalKeywords.includes('Senior'));
    assert.ok(defense.technicalKeywords.includes('bug'));
  });

  it('handles null issue with safe architectural defense fallback', () => {
    const defense = generateInterviewDefense(null, mockProfile, null);

    assert.strictEqual(defense.headline, 'Issue Selection Rationale');
    assert.ok(defense.elevatorPitch.length > 20);
    assert.ok(defense.talkingPoints.length >= 2);
    assert.deepStrictEqual(defense.technicalKeywords, []);
  });

  it('handles null profile gracefully using issue language and default tier', () => {
    const defense = generateInterviewDefense(mockIssue, null, mockBreakdown);

    assert.ok(defense.elevatorPitch.includes('Intermediate-tier'));
    assert.ok(defense.elevatorPitch.includes('TypeScript'));
    assert.ok(defense.talkingPoints[1].includes('98/100'));
  });

  it('handles missing relevance breakdown with fallback score', () => {
    const defense = generateInterviewDefense(mockIssue, mockProfile, null);

    assert.ok(defense.talkingPoints[1].includes('85/100'));
  });

  it('extracts issue number from ID if URL pattern is non-standard', () => {
    const customIssue: NormalizedIssue = {
      ...mockIssue,
      url: 'https://gitlab.com/custom/repo',
      id: 'custom-999',
    };

    const defense = generateInterviewDefense(customIssue, mockProfile, mockBreakdown);
    assert.ok(defense.elevatorPitch.includes('#custom-999'));
  });
});
