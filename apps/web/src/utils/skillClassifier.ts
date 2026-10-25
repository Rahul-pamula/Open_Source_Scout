import type { SkillCategory, CategorizedSkillsCollection } from '../types/skills';
import { isLinguistLanguage, normalizeLinguistLanguage } from './linguistLanguages';

const KNOWN_FRAMEWORKS = new Set<string>([
  'react',
  'reactjs',
  'react.js',
  'nextjs',
  'next.js',
  'vue',
  'vuejs',
  'vue.js',
  'angular',
  'svelte',
  'sveltekit',
  'nuxt',
  'nuxtjs',
  'remix',
  'express',
  'expressjs',
  'nestjs',
  'django',
  'flask',
  'fastapi',
  'rails',
  'ruby on rails',
  'spring',
  'spring boot',
  'asp.net',
  'aspnet',
  '.net',
  'dotnet',
  'laravel',
  'symfony',
  'gin',
  'echo',
  'actix',
  'axum',
  'rocket',
  'fiber',
  'tailwind',
  'tailwindcss',
  'bootstrap',
  'electron',
  'tauri',
  'react native',
  'flutter',
  'prisma',
  'drizzle',
  'graphql',
  'apollo',
]);

const KNOWN_DOMAINS = new Set<string>([
  'ai/ml',
  'ai',
  'ml',
  'machine learning',
  'artificial intelligence',
  'deep learning',
  'data science',
  'data engineering',
  'devops',
  'cloud',
  'cloud computing',
  'infrastructure',
  'security',
  'cybersecurity',
  'infosec',
  'blockchain',
  'web3',
  'crypto',
  'mobile',
  'ios',
  'android',
  'embedded',
  'iot',
  'systems',
  'game dev',
  'game development',
  'fullstack',
  'frontend',
  'backend',
  'testing',
  'qa',
  'database',
  'databases',
]);

/**
 * Classifies an individual skill string into 'language', 'framework', or 'domain'.
 */
export function classifySkill(skill: string | null | undefined): SkillCategory {
  if (!skill || typeof skill !== 'string') return 'framework';
  const clean = skill.trim().toLowerCase();

  if (KNOWN_DOMAINS.has(clean)) {
    return 'domain';
  }

  if (KNOWN_FRAMEWORKS.has(clean)) {
    return 'framework';
  }

  if (isLinguistLanguage(clean)) {
    return 'language';
  }

  // Heuristic fallbacks: common domain terms
  if (
    clean.includes('learning') ||
    clean.includes('cloud') ||
    clean.includes('security') ||
    clean.includes('ops') ||
    clean.includes('data')
  ) {
    return 'domain';
  }

  return 'framework';
}

/**
 * Categorizes a list of skills into languages, frameworks, and domains,
 * deduplicating entries and normalizing language names.
 */
export function classifySkills(skills: (string | null | undefined)[]): CategorizedSkillsCollection {
  const result: CategorizedSkillsCollection = {
    languages: [],
    frameworks: [],
    domains: [],
  };

  const seenLanguages = new Set<string>();
  const seenFrameworks = new Set<string>();
  const seenDomains = new Set<string>();

  for (const rawSkill of skills) {
    if (!rawSkill || typeof rawSkill !== 'string') continue;
    const trimmed = rawSkill.trim();
    if (!trimmed) continue;

    const category = classifySkill(trimmed);

    if (category === 'language') {
      const canonical = normalizeLinguistLanguage(trimmed) || trimmed;
      const key = canonical.toLowerCase();
      if (!seenLanguages.has(key)) {
        seenLanguages.add(key);
        result.languages.push(canonical);
      }
    } else if (category === 'framework') {
      const key = trimmed.toLowerCase();
      if (!seenFrameworks.has(key)) {
        seenFrameworks.add(key);
        result.frameworks.push(trimmed);
      }
    } else {
      const key = trimmed.toLowerCase();
      if (!seenDomains.has(key)) {
        seenDomains.add(key);
        result.domains.push(trimmed);
      }
    }
  }

  return result;
}
