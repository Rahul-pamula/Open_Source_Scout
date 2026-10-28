import test from 'node:test';
import assert from 'node:assert';
import { rankSkillsByRelevance, tokenizeText, Skill } from './skills.js';

test('TF-IDF Skills Relevance Scoring Suite', async (t) => {
  const sampleSkills: Skill[] = [
    {
      filename: 'docker.md',
      name: 'docker-deployment',
      description: 'Docker containerization and multi-stage image builds',
      trigger: 'CONDITIONAL',
      content: 'Commands for docker build, docker tag, and registry push.',
      tags: ['docker', 'containers', 'devops'],
      languages: ['dockerfile'],
    },
    {
      filename: 'postgres.md',
      name: 'postgres-database',
      description: 'PostgreSQL migrations, indexing, and connection pools',
      trigger: 'CONDITIONAL',
      content: 'Schema migration guidelines, sql query tuning, and pg connection pooling.',
      tags: ['database', 'sql', 'postgres'],
      languages: ['sql'],
    },
    {
      filename: 'k8s.md',
      name: 'kubernetes-helm',
      description: 'Deploy workloads via Helm charts and k8s manifests',
      trigger: 'CONDITIONAL',
      content: 'Configure pods, deployments, and ingress controllers.',
      tags: ['k8s', 'kubernetes', 'helm'],
    },
    {
      filename: 'general.md',
      name: 'code-review-standards',
      description: 'General guidelines for code quality, naming, and review',
      trigger: 'CONDITIONAL',
      content: 'Check for variable naming, code comments, and style consistency.',
      tags: ['review', 'quality'],
    },
    {
      filename: 'always.md',
      name: 'security-guardrails',
      description: 'Critical repository security guardrails and secret prevention',
      trigger: 'ALWAYS',
      content: 'Never commit credentials or private keys.',
      tags: ['security'],
    },
  ];

  await t.test('1. Highly relevant skills score significantly higher than irrelevant skills', () => {
    const results = rankSkillsByRelevance(sampleSkills, 'How do I tune my PostgreSQL database migrations?');
    assert.ok(results.length >= 2);
    // Security (ALWAYS) is first, postgres is the top ranked CONDITIONAL match
    assert.strictEqual(results[0].name, 'security-guardrails');
    assert.strictEqual(results[1].name, 'postgres-database');
  });

  await t.test('2. Produces deterministic ranking output across repeated executions', () => {
    const query = 'Build and tag container images with docker';
    const firstRun = rankSkillsByRelevance(sampleSkills, query).map((s) => s.name);
    const secondRun = rankSkillsByRelevance(sampleSkills, query).map((s) => s.name);
    assert.deepStrictEqual(firstRun, secondRun);
    assert.ok(firstRun.includes('docker-deployment'));
  });

  await t.test('3. Rare technical terms with high IDF receive stronger boost than ubiquitous terms', () => {
    const results = rankSkillsByRelevance(sampleSkills, 'Configure helm chart values for ingress');
    const matchedNames = results.map((s) => s.name);
    assert.ok(matchedNames.includes('kubernetes-helm'));
    // kubernetes-helm should be prioritized over general code review
    const k8sIndex = matchedNames.indexOf('kubernetes-helm');
    const reviewIndex = matchedNames.indexOf('code-review-standards');
    assert.ok(reviewIndex === -1 || k8sIndex < reviewIndex);
  });

  await t.test('4. Name matches receive 5x field weighting over body content matches', () => {
    const skills: Skill[] = [
      {
        filename: 'content-match.md',
        name: 'utility-helper',
        description: 'Miscellaneous tools and helpers',
        trigger: 'CONDITIONAL',
        content: 'Mentions terraform multiple times in body text for cloud.',
      },
      {
        filename: 'name-match.md',
        name: 'terraform-iac',
        description: 'Infrastructure as code',
        trigger: 'CONDITIONAL',
        content: 'Brief infra guidelines.',
      },
    ];

    const results = rankSkillsByRelevance(skills, 'terraform cloud infrastructure');
    assert.strictEqual(results.length, 2);
    assert.strictEqual(results[0].name, 'terraform-iac');
  });

  await t.test('5. ALWAYS trigger skills always supersede all scores and rank first', () => {
    const results = rankSkillsByRelevance(sampleSkills, 'postgres database query tuning');
    assert.strictEqual(results[0].trigger, 'ALWAYS');
    assert.strictEqual(results[0].name, 'security-guardrails');
  });

  await t.test('6. Filter options boost skills matching target tech stack languages', () => {
    const polyglotSkills: Skill[] = [
      {
        filename: 'py-test.md',
        name: 'test-runner-py',
        description: 'Unit testing guidelines',
        trigger: 'CONDITIONAL',
        content: 'Testing code',
        languages: ['python'],
      },
      {
        filename: 'ts-test.md',
        name: 'test-runner-ts',
        description: 'Unit testing guidelines',
        trigger: 'CONDITIONAL',
        content: 'Testing code',
        languages: ['typescript'],
      },
    ];

    const results = rankSkillsByRelevance(polyglotSkills, 'Unit testing guidelines', 5, {
      languages: ['typescript'],
    });
    assert.ok(results.length >= 1);
    assert.strictEqual(results[0].name, 'test-runner-ts');
  });

  await t.test('7. Handles empty query or empty skills gracefully', () => {
    assert.deepStrictEqual(rankSkillsByRelevance([], 'some query'), []);
    const noQuery = rankSkillsByRelevance(sampleSkills, '');
    assert.strictEqual(noQuery.length, sampleSkills.length);
  });

  await t.test('8. Tokenizer filters common stopwords and normalizes alphanumeric stems', () => {
    const tokens = tokenizeText('How do I build the docker containers with code and project?');
    assert.ok(tokens.includes('build'));
    assert.ok(tokens.includes('docker'));
    assert.ok(tokens.includes('containers'));
    assert.ok(!tokens.includes('how'));
    assert.ok(!tokens.includes('the'));
    assert.ok(!tokens.includes('with'));
    assert.ok(!tokens.includes('and'));
  });
});
