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
        const parsed = matter(content);

        if (!parsed.data.name || !parsed.data.description) {
          skillLruCache.set(filePath, stat.mtimeMs, null);
          return;
        }

        const skill: Skill = {
          filename: path.basename(filePath),
          name: String(parsed.data.name),
          description: String(parsed.data.description),
          trigger: parsed.data.trigger ? String(parsed.data.trigger) : 'CONDITIONAL',
          content: parsed.content,
        };

        skillLruCache.set(filePath, stat.mtimeMs, skill);
        skills.push(skill);
      } catch (e: any) {
        console.error(`[Scout] Failed to parse skill file ${filePath}: ${e.message}. Skipping.`);
      }
    }),
  );

  // Stable sort by filename/name for deterministic ordering
  skills.sort((a, b) => a.filename.localeCompare(b.filename));

  const allSkills = skills;

  if (!targetTaskDescription) {
    return allSkills;
  }

  const activeSkills: Array<Skill & { _score: number }> = [];
  const words = targetTaskDescription
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3);

  for (const skill of allSkills) {
    if (skill.trigger === 'ALWAYS') {
      activeSkills.push({ ...skill, _score: 999 });
      continue;
    }

    let score = 0;
    if (typeof skill.name !== 'string') {
      console.error(`Invalid skill name type for ${skill.filename}:`, typeof skill.name, skill.name);
      continue;
    }
    const name = skill.name.toLowerCase();
    const desc = skill.description.toLowerCase();

    for (const word of words) {
      if (name.includes(word)) score += 5;
      if (desc.includes(word)) score += 1;
    }

    if (score > 1) {
      activeSkills.push({ ...skill, _score: score });
    }
  }

  activeSkills.sort((a, b) => b._score - a._score);

  return activeSkills.slice(0, 8).map((s) => {
    const { _score, ...rest } = s;
    return rest;
  });
}
