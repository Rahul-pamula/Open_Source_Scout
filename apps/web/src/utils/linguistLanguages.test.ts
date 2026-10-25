import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isLinguistLanguage,
  normalizeLinguistLanguage,
  getLinguistLanguages,
} from './linguistLanguages';

describe('linguistLanguages registry & validation', () => {
  describe('isLinguistLanguage', () => {
    it('returns true for recognized programming languages regardless of casing', () => {
      assert.equal(isLinguistLanguage('TypeScript'), true);
      assert.equal(isLinguistLanguage('typescript'), true);
      assert.equal(isLinguistLanguage('PYTHON'), true);
      assert.equal(isLinguistLanguage('Rust'), true);
      assert.equal(isLinguistLanguage('Go'), true);
      assert.equal(isLinguistLanguage('C++'), true);
      assert.equal(isLinguistLanguage('C#'), true);
    });

    it('returns true for recognized language aliases', () => {
      assert.equal(isLinguistLanguage('ts'), true);
      assert.equal(isLinguistLanguage('js'), true);
      assert.equal(isLinguistLanguage('py'), true);
      assert.equal(isLinguistLanguage('golang'), true);
      assert.equal(isLinguistLanguage('rs'), true);
      assert.equal(isLinguistLanguage('rb'), true);
      assert.equal(isLinguistLanguage('cpp'), true);
      assert.equal(isLinguistLanguage('cs'), true);
    });

    it('returns false for frameworks, tools, and non-language skills', () => {
      assert.equal(isLinguistLanguage('React'), false);
      assert.equal(isLinguistLanguage('Next.js'), false);
      assert.equal(isLinguistLanguage('Docker'), false);
      assert.equal(isLinguistLanguage('Kubernetes'), false);
      assert.equal(isLinguistLanguage('TailwindCSS'), false);
      assert.equal(isLinguistLanguage('GraphQL'), false);
      assert.equal(isLinguistLanguage('PostgreSQL'), false);
    });

    it('returns false for empty or non-string inputs', () => {
      assert.equal(isLinguistLanguage(null), false);
      assert.equal(isLinguistLanguage(undefined), false);
      assert.equal(isLinguistLanguage(''), false);
      assert.equal(isLinguistLanguage('   '), false);
    });
  });

  describe('normalizeLinguistLanguage', () => {
    it('normalizes aliases to their canonical Linguist names', () => {
      assert.equal(normalizeLinguistLanguage('ts'), 'TypeScript');
      assert.equal(normalizeLinguistLanguage('js'), 'JavaScript');
      assert.equal(normalizeLinguistLanguage('py'), 'Python');
      assert.equal(normalizeLinguistLanguage('golang'), 'Go');
      assert.equal(normalizeLinguistLanguage('cpp'), 'C++');
      assert.equal(normalizeLinguistLanguage('csharp'), 'C#');
      assert.equal(normalizeLinguistLanguage('rb'), 'Ruby');
    });

    it('normalizes lowercase canonical names', () => {
      assert.equal(normalizeLinguistLanguage('typescript'), 'TypeScript');
      assert.equal(normalizeLinguistLanguage('python'), 'Python');
      assert.equal(normalizeLinguistLanguage('rust'), 'Rust');
    });

    it('returns null for non-languages and invalid input', () => {
      assert.equal(normalizeLinguistLanguage('React'), null);
      assert.equal(normalizeLinguistLanguage('Tailwind'), null);
      assert.equal(normalizeLinguistLanguage(null), null);
      assert.equal(normalizeLinguistLanguage(''), null);
    });
  });

  describe('getLinguistLanguages', () => {
    it('returns an array containing major programming languages', () => {
      const languages = getLinguistLanguages();
      assert.ok(Array.isArray(languages));
      assert.ok(languages.length > 30);
      assert.ok(languages.includes('TypeScript'));
      assert.ok(languages.includes('Python'));
      assert.ok(languages.includes('Rust'));
      assert.ok(languages.includes('Go'));
    });
  });
});
