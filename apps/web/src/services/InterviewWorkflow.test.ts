import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateAndNormalizeNotesUrl } from './interviewNotesService';
import { calculateRelevanceScore } from '../utils/relevanceScorer';
import { generateInterviewDefense } from '../utils/interviewDefenseGenerator';
import { Task, IssueState } from '../types';
import { UserProfile } from '../types/user';
import { IssueScoringTarget } from '../types/relevance';

describe('InterviewWorkflow end-to-end lifecycle simulation', () => {
  const mockCandidateProfile: UserProfile = {
    id: 'user-cand-99',
    user_metadata: {
      user_name: 'alex_engineer',
      full_name: 'Alex Engineer',
    },
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
    experience_level: 'Intermediate',
    preferred_languages: ['TypeScript', 'JavaScript'],
    preferred_frameworks: ['React', 'Node.js'],
  };

  const rawDiscoveredIssue: IssueScoringTarget & {
    id: string;
    url: string;
    repoName: string;
    language: string;
  } = {
    id: 'iss-987',
    title: 'fix(pipeline): optimize task state transitions and add interview prep hooks',
    body: 'The active task pipeline needs deterministic status transitions and interview notes link support.',
    url: 'https://github.com/facebook/react/issues/987',
    labels: ['bug', 'help wanted', 'react', 'typescript'],
    language: 'TypeScript',
    comments: 1,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    repoName: 'facebook/react',
  };

  it('Step 1: Discovery & Evaluation - calculates relevance and defensibility score', () => {
    const relevance = calculateRelevanceScore(rawDiscoveredIssue, mockCandidateProfile);

    assert.ok(relevance.total >= 70, `Expected score >= 70, got ${relevance.total}`);
    assert.strictEqual(relevance.difficultyScore, 10, 'Intermediate difficulty matched');
    assert.ok(relevance.langScore > 0, 'Language score awarded for TypeScript');
    assert.ok(relevance.techScore > 0, 'Tech score awarded for React');

    const defense = generateInterviewDefense(rawDiscoveredIssue, mockCandidateProfile, relevance);

    assert.strictEqual(defense.talkingPoints.length, 4);
    assert.ok(defense.talkingPoints.some((tp) => tp.includes('Targeted Domain Alignment')));
    assert.ok(defense.elevatorPitch.includes('Intermediate-tier proficiency'));
  });

  it('Step 2: Transition through Pipeline Lifecycle (DISCOVERED -> EVALUATED -> ASSIGNED -> COMPLETED)', () => {
    // Initial task created in DISCOVERED state
    let task: Task = {
      id: 'task-workflow-01',
      user_id: mockCandidateProfile.id,
      platform: 'github',
      external_id: '987',
      external_url: rawDiscoveredIssue.url,
      github_issue_url: rawDiscoveredIssue.url,
      title: rawDiscoveredIssue.title,
      repo_name: rawDiscoveredIssue.repoName,
      state: 'DISCOVERED',
      labels: rawDiscoveredIssue.labels as string[],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    assert.strictEqual(task.state, 'DISCOVERED');

    // Action: Evaluate issue
    const relevance = calculateRelevanceScore(rawDiscoveredIssue, mockCandidateProfile);
    task = {
      ...task,
      state: 'EVALUATED' as IssueState,
      match_score: relevance.total,
      updated_at: new Date().toISOString(),
    };
    assert.strictEqual(task.state, 'EVALUATED');
    assert.strictEqual(task.match_score, relevance.total);

    // Action: Claim / Assign issue
    task = {
      ...task,
      state: 'ASSIGNED' as IssueState,
      agent_status: 'in_progress',
      updated_at: new Date().toISOString(),
    };
    assert.strictEqual(task.state, 'ASSIGNED');
    assert.strictEqual(task.agent_status, 'in_progress');

    // Action: Pull Request opened and merged -> COMPLETED
    const mergedPrUrl = 'https://github.com/facebook/react/pull/1234';
    task = {
      ...task,
      state: 'COMPLETED' as IssueState,
      pr_url: mergedPrUrl,
      agent_status: 'merged',
      updated_at: new Date().toISOString(),
    };
    assert.strictEqual(task.state, 'COMPLETED');
    assert.strictEqual(task.pr_url, mergedPrUrl);
    assert.strictEqual(task.agent_status, 'merged');
  });

  it('Step 3: Post-Merge Interview Preparation - validates and normalizes Google Docs link', () => {
    const rawGoogleDocsInput = '  docs.google.com/document/d/1A2B3C4D5E6F/edit?usp=sharing  ';
    const validation = validateAndNormalizeNotesUrl(rawGoogleDocsInput);

    assert.strictEqual(validation.valid, true);
    assert.strictEqual(
      validation.normalizedUrl,
      'https://docs.google.com/document/d/1A2B3C4D5E6F/edit?usp=sharing',
    );
  });

  it('Step 4: Interview Notes Capture - optimistic local state update and rollback resilience', () => {
    let completedTask: Task = {
      id: 'task-workflow-02',
      user_id: mockCandidateProfile.id,
      platform: 'github',
      external_id: '987',
      external_url: rawDiscoveredIssue.url,
      title: rawDiscoveredIssue.title,
      state: 'COMPLETED',
      pr_url: 'https://github.com/facebook/react/pull/1234',
      interview_notes_url: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const previousUrl = completedTask.interview_notes_url;
    const incomingNotesUrl = 'https://docs.google.com/document/d/1A2B3C4D5E6F/edit';

    // Optimistic update
    completedTask = {
      ...completedTask,
      interview_notes_url: incomingNotesUrl,
      contribution_checklist: {
        ...completedTask.contribution_checklist,
        interview_notes_url: incomingNotesUrl,
      },
    };

    assert.strictEqual(completedTask.interview_notes_url, incomingNotesUrl);
    assert.strictEqual(completedTask.contribution_checklist.interview_notes_url, incomingNotesUrl);

    // Rollback simulation in case of simulated persistence failure
    const simulateFailure = true;
    if (simulateFailure) {
      completedTask = {
        ...completedTask,
        interview_notes_url: previousUrl,
        contribution_checklist: {
          ...completedTask.contribution_checklist,
          interview_notes_url: previousUrl,
        },
      };
    }

    assert.strictEqual(completedTask.interview_notes_url, undefined);
  });

  it('Step 5: End-to-End Interview Defense Package Readiness', () => {
    const relevance = calculateRelevanceScore(rawDiscoveredIssue, mockCandidateProfile);
    const defense = generateInterviewDefense(rawDiscoveredIssue, mockCandidateProfile, relevance);
    const validNotesUrl = 'https://docs.google.com/document/d/1A2B3C4D5E6F/edit';

    const mergedPreparedTask: Task = {
      id: 'task-workflow-ready',
      user_id: mockCandidateProfile.id,
      platform: 'github',
      external_id: '987',
      external_url: rawDiscoveredIssue.url,
      title: rawDiscoveredIssue.title,
      repo_name: rawDiscoveredIssue.repoName,
      state: 'COMPLETED',
      match_score: relevance.total,
      pr_url: 'https://github.com/facebook/react/pull/1234',
      interview_notes_url: validNotesUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    assert.strictEqual(mergedPreparedTask.state, 'COMPLETED');
    assert.ok(mergedPreparedTask.interview_notes_url?.includes('docs.google.com'));
    assert.strictEqual(defense.talkingPoints.length, 4);
    assert.ok(defense.talkingPoints.some((tp) => tp.includes('Targeted Domain Alignment')));
    assert.ok(defense.talkingPoints.some((tp) => tp.includes('Algorithmic Selection')));
    assert.ok(defense.talkingPoints.some((tp) => tp.includes('Maintainer Empathy')));
    assert.ok(defense.talkingPoints.some((tp) => tp.includes('Production Readiness')));
  });
});
