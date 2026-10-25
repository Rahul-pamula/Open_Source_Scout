import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifySkill, classifySkills } from './skillClassifier';

describe('skillClassifier taxonomy utility', () => {
  describe('classifySkill', () => {
    it('identifies programming languages accurately', () => {
      assert.equal(classifySkill('TypeScript'), 'language');
      assert.equal(classifySkill('python'), 'language');
      assert.equal(classifySkill('Rust'), 'language');
      assert.equal(classifySkill('golang'), 'language');
      assert.equal(classifySkill('c++'), 'language');
      assert.equal(classifySkill('Ruby'), 'language');
    });

    it('identifies web and backend frameworks', () => {
      assert.equal(classifySkill('React'), 'framework');
      assert.equal(classifySkill('Next.js'), 'framework');
      assert.equal(classifySkill('Vue'), 'framework');
      assert.equal(classifySkill('FastAPI'), 'framework');
      assert.equal(classifySkill('Django'), 'framework');
      assert.equal(classifySkill('Express'), 'framework');
      assert.equal(classifySkill('TailwindCSS'), 'framework');
    });

    it('identifies engineering domains and specializations', () => {
      assert.equal(classifySkill('AI/ML'), 'domain');
      assert.equal(classifySkill('Machine Learning'), 'domain');
      assert.equal(classifySkill('DevOps'), 'domain');
      assert.equal(classifySkill('Cloud Computing'), 'domain');
      assert.equal(classifySkill('Cybersecurity'), 'domain');
      assert.equal(classifySkill('Mobile'), 'domain');
    });

    it('safely handles invalid or empty inputs with fallback', () => {
      assert.equal(classifySkill(null), 'framework');
      assert.equal(classifySkill(undefined), 'framework');
      assert.equal(classifySkill(''), 'framework');
      assert.equal(classifySkill('unknown-tool-xyz'), 'framework');
    });
  });

  describe('classifySkills', () => {
    it('partitions a mixed list of skills into languages, frameworks, and domains', () => {
      const skills = ['TypeScript', 'React', 'Python', 'FastAPI', 'AI/ML', 'DevOps', 'Rust'];

      const result = classifySkills(skills);

      assert.deepEqual(result.languages, ['TypeScript', 'Python', 'Rust']);
      assert.deepEqual(result.frameworks, ['React', 'FastAPI']);
      assert.deepEqual(result.domains, ['AI/ML', 'DevOps']);
    });

    it('deduplicates case-insensitively and maps aliases to canonical language names', () => {
      const skills = ['ts', 'TypeScript', 'typescript', 'React', 'react', 'DevOps'];
      const result = classifySkills(skills);

      assert.deepEqual(result.languages, ['TypeScript']);
      assert.deepEqual(result.frameworks, ['React']);
      assert.deepEqual(result.domains, ['DevOps']);
    });

    it('handles empty lists, nulls, and whitespace strings gracefully', () => {
      const result = classifySkills([null, '', '   ', undefined]);
      assert.deepEqual(result.languages, []);
      assert.deepEqual(result.frameworks, []);
      assert.deepEqual(result.domains, []);
    });
  });
});
