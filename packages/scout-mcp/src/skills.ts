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

// In-Memory Skill Cache
// Caches parsed SKILL.md files to prevent redundant disk I/O when
// handling frequent skill lookups or large skill repositories.
let skillCache: Skill[] | null = null;

export function clearSkillCache() {
  skillCache = null;
}

/**
 * Loads and ranks skills from the project's .scout/skills directory asynchronously.
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

  let allSkills = skillCache;

  if (allSkills === null) {
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
        skillCache = [];
        return skillCache;
      }
    }

    const markdownFiles = await findMarkdownFilesAsync(skillsDir);
    const skills: Skill[] = [];

    await Promise.all(
      markdownFiles.map(async (filePath) => {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const parsed = matter(content);

          if (!parsed.data.name || !parsed.data.description) {
            return;
          }

          skills.push({
            filename: path.basename(filePath),
            name: String(parsed.data.name),
            description: String(parsed.data.description),
            trigger: parsed.data.trigger ? String(parsed.data.trigger) : 'CONDITIONAL',
            content: parsed.content,
          });
        } catch (e: any) {
          console.error(`[Scout] Failed to parse skill file ${filePath}: ${e.message}. Skipping.`);
        }
      }),
    );

    // Stable sort by filename/name for deterministic ordering
    skills.sort((a, b) => a.filename.localeCompare(b.filename));

    skillCache = skills;
    allSkills = skills;
  }

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
