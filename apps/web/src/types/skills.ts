export type SkillCategory = 'language' | 'framework' | 'domain';

export interface CategorizedSkill {
  name: string;
  category: SkillCategory;
  description?: string;
  aliases?: string[];
}

export type LanguageSkill = CategorizedSkill & { category: 'language' };
export type FrameworkSkill = CategorizedSkill & { category: 'framework' };
export type DomainSkill = CategorizedSkill & { category: 'domain' };

export interface CategorizedSkillsCollection {
  languages: string[];
  frameworks: string[];
  domains: string[];
}

export function isSkillCategory(val: unknown): val is SkillCategory {
  return val === 'language' || val === 'framework' || val === 'domain';
}
