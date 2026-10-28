import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Skill {
  filename: string;
  name: string;
  description: string;
  trigger: string;
  content: string;
}

/**
 * Checks if a path exists asynchronously without blocking the event loop.
 */
export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Recursively locates all markdown files asynchronously without blocking I/O.
 */
export async function findMarkdownFilesAsync(dir: string): Promise<string[]> {
  const result: string[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await findMarkdownFilesAsync(fullPath);
        result.push(...subFiles);
      } else if (entry.name.endsWith('.md')) {
        result.push(fullPath);
      }
    }
  } catch {
    // Gracefully handle missing or inaccessible directories
  }
  return result;
}

export interface CachedSkillEntry {
  mtimeMs: number;
  skill: Skill | null;
  lastAccessed: number;
}

/**
 * LRU Cache for parsed skills with mtime-based invalidation.
 * Automatically evicts least recently accessed entries when capacity is reached,
 * and invalidates entries when the underlying file's mtime changes on disk.
 */
export class SkillLRUCache {
  private cache = new Map<string, CachedSkillEntry>();
  private maxEntries: number;
  private hits = 0;
  private misses = 0;

  constructor(maxEntries = 256) {
    this.maxEntries = maxEntries;
  }

  get(filePath: string, mtimeMs: number): Skill | null | undefined {
    const entry = this.cache.get(filePath);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (entry.mtimeMs !== mtimeMs) {
      this.cache.delete(filePath);
      this.misses++;
      return undefined;
    }
    this.hits++;
    // Re-insert to refresh LRU order
    this.cache.delete(filePath);
    this.cache.set(filePath, { ...entry, lastAccessed: Date.now() });
    return entry.skill;
  }

  set(filePath: string, mtimeMs: number, skill: Skill | null): void {
    if (this.cache.has(filePath)) {
      this.cache.delete(filePath);
    } else if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(filePath, { mtimeMs, skill, lastAccessed: Date.now() });
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): { hits: number; misses: number; size: number } {
    return { hits: this.hits, misses: this.misses, size: this.cache.size };
  }
}

export const skillLruCache = new SkillLRUCache(256);

export function clearSkillCache(): void {
  skillLruCache.clear();
}

export function getSkillCacheStats(): { hits: number; misses: number; size: number } {
  return skillLruCache.getStats();
}

export interface SkillParseResult {
  success: boolean;
  skill?: Skill;
  warning?: string;
}

/**
 * Safely parses markdown content and YAML frontmatter with robust error recovery.
 * Recovers gracefully from malformed syntax, invalid escape sequences, non-object frontmatter,
 * or missing mandatory fields (name, description).
 */
export function parseSkillFrontmatter(rawContent: string, filename: string): SkillParseResult {
  if (!rawContent || typeof rawContent !== 'string') {
    return {
      success: false,
      warning: `Empty or non-string file content in ${filename}`,
    };
  }

  if (!matter.test(rawContent)) {
    return {
      success: false,
      warning: `Skill in ${filename} is missing frontmatter delimiters ('---')`,
    };
  }

  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(rawContent, { cache: false });
  } catch (err: any) {
    return {
      success: false,
      warning: `YAML syntax parse error in ${filename}: ${err?.message || String(err)}`,
    };
  }

  if (!parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
    return {
      success: false,
      warning: `Frontmatter in ${filename} must be a key-value object`,
    };
  }

  const name = typeof parsed.data.name === 'string' ? parsed.data.name.trim() : '';
  const description =
    typeof parsed.data.description === 'string' ? parsed.data.description.trim() : '';

  if (!name) {
    return {
      success: false,
      warning: `Skill in ${filename} is missing mandatory 'name' frontmatter field`,
    };
  }

  if (!description) {
    return {
      success: false,
      warning: `Skill in ${filename} is missing mandatory 'description' frontmatter field`,
    };
  }

  const trigger =
    typeof parsed.data.trigger === 'string' && parsed.data.trigger.trim()
      ? parsed.data.trigger.trim().toUpperCase()
      : 'CONDITIONAL';

  return {
    success: true,
    skill: {
      filename,
      name,
      description,
      trigger,
      content: parsed.content || '',
    },
  };
}

/**
 * Loads and ranks skills from the project's .scout/skills directory asynchronously.
 * Leverages LRU caching and mtime checks to eliminate redundant YAML parsing on disk.
 */
export async function loadSkills(taskDescription?: string, cwd?: string): Promise<Skill[]> {
  let targetCwd = cwd;
  let targetTaskDescription = taskDescription;

  if (
    taskDescription &&
    !cwd &&
    (path.isAbsolute(taskDescription) ||
      taskDescription.startsWith('.') ||
      (await pathExists(taskDescription)))
  ) {
    targetCwd = taskDescription;
    targetTaskDescription = undefined;
  } else if (!targetCwd) {
    targetCwd = process.cwd();
  }

  const skillsDir = path.join(targetCwd, '.scout', 'skills');
  const skillsDirExists = await pathExists(skillsDir);

  if (!skillsDirExists) {
    // Auto-Bootstrapping: Scaffold default skills from the MCP package if they don't exist
    const defaultSkillsPath = path.resolve(__dirname, '../default-skills');
    const defaultSkillsExist = await pathExists(defaultSkillsPath);

    if (defaultSkillsExist) {
      await fs.cp(defaultSkillsPath, skillsDir, { recursive: true });
      console.error(`[Scout] Auto-bootstrapped default skills into ${skillsDir}`);
    } else {
      return [];
    }
  }

  const markdownFiles = await findMarkdownFilesAsync(skillsDir);
  const skills: Skill[] = [];

  await Promise.all(
    markdownFiles.map(async (filePath) => {
      try {
        const stat = await fs.stat(filePath);
        const cached = skillLruCache.get(filePath, stat.mtimeMs);

        if (cached !== undefined) {
          if (cached) {
            skills.push(cached);
          }
          return;
        }

        const content = await fs.readFile(filePath, 'utf8');
        const filename = path.basename(filePath);
        const result = parseSkillFrontmatter(content, filename);

        if (!result.success || !result.skill) {
          if (result.warning) {
            console.warn(`[Scout Skills] ${result.warning}`);
          }
          skillLruCache.set(filePath, stat.mtimeMs, null);
          return;
        }

        skillLruCache.set(filePath, stat.mtimeMs, result.skill);
        skills.push(result.skill);
      } catch (e: any) {
        console.warn(`[Scout Skills] Failed to process skill file ${filePath}: ${e?.message || e}. Skipping.`);
        try {
          const stat = await fs.stat(filePath);
          skillLruCache.set(filePath, stat.mtimeMs, null);
        } catch {
          // Ignore stat failure
        }
      }
    }),
  );

  // Stable sort by filename/name for deterministic ordering
  skills.sort((a, b) => a.filename.localeCompare(b.filename));

  const allSkills = skills;

  if (!targetTaskDescription) {
    return allSkills;
  }

  return rankSkillsByRelevance(allSkills, targetTaskDescription, 8);
}

const COMMON_STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'the', 'this', 'but', 'they', 'have', 'had', 'what', 'when',
  'where', 'who', 'which', 'why', 'how', 'all', 'any', 'both', 'each', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'can', 'just', 'should', 'now', 'help',
  'about', 'into', 'over', 'after', 'with', 'code', 'project',
]);

/**
 * Tokenizes text into normalized lowercase alphanumeric keyword terms.
 */
export function tokenizeText(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const rawTokens = text.toLowerCase().match(/\b[a-z0-9_-]{2,}\b/g) || [];
  return rawTokens.filter((token) => !COMMON_STOPWORDS.has(token));
}

/**
 * Computes TF-IDF relevance scores for each skill against a task query.
 * Weights terms by field prominence: name (5x), description (2x), content (1x).
 * Prioritizes skills matching specific, low-frequency technical terms over generic words.
 */
export function rankSkillsByRelevance(skills: Skill[], query: string, maxResults = 8): Skill[] {
  if (!skills.length) return [];
  const queryTokens = tokenizeText(query);
  if (!queryTokens.length) return skills.slice(0, maxResults);

  const numDocs = skills.length;
  // Compute Document Frequency (DF) across the skills collection
  const docFreq = new Map<string, number>();

  // Pre-tokenize skills with field weights
  const tokenizedSkills = skills.map((skill) => {
    const nameTokens = tokenizeText(skill.name);
    const descTokens = tokenizeText(skill.description);
    const contentTokens = tokenizeText(skill.content.slice(0, 1500));

    const termWeights = new Map<string, number>();
    for (const t of nameTokens) termWeights.set(t, (termWeights.get(t) || 0) + 5);
    for (const t of descTokens) termWeights.set(t, (termWeights.get(t) || 0) + 2);
    for (const t of contentTokens) termWeights.set(t, (termWeights.get(t) || 0) + 1);

    for (const t of termWeights.keys()) {
      docFreq.set(t, (docFreq.get(t) || 0) + 1);
    }

    return { skill, termWeights };
  });

  const scoredSkills: Array<{ skill: Skill; score: number }> = [];

  for (const { skill, termWeights } of tokenizedSkills) {
    if (skill.trigger === 'ALWAYS') {
      scoredSkills.push({ skill, score: 99999 });
      continue;
    }

    let score = 0;
    for (const queryTerm of queryTokens) {
      const weight = termWeights.get(queryTerm);
      if (weight !== undefined && weight > 0) {
        const df = docFreq.get(queryTerm) || 1;
        // Sublinear TF * smooth IDF
        const tf = 1 + Math.log(weight);
        const idf = Math.log(1 + numDocs / df) + 1;
        score += tf * idf;
      }
    }

    if (score > 0) {
      scoredSkills.push({ skill, score });
    }
  }

  scoredSkills.sort((a, b) => b.score - a.score);
  return scoredSkills.slice(0, maxResults).map((s) => s.skill);
}
