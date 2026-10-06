import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findMarkdownFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findMarkdownFiles(filePath, fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

// In-Memory Skill Cache
// Caches parsed SKILL.md files on boot to prevent disk I/O bottlenecks when
// loading massive skill repositories (like claude-skills).
let skillCache: any[] | null = null;

export function loadSkills(taskDescription?: string, cwd: string = process.cwd()) {
  let allSkills = skillCache;

  if (allSkills === null) {
    const skillsDir = path.join(cwd, '.scout', 'skills');
    if (!fs.existsSync(skillsDir)) {
      // Auto-Bootstrapping: Scaffold default skills from the MCP package if they don't exist
      const defaultSkillsPath = path.resolve(__dirname, '../default-skills');
      if (fs.existsSync(defaultSkillsPath)) {
        fs.cpSync(defaultSkillsPath, skillsDir, { recursive: true });
        console.error(`[Scout] Auto-bootstrapped default skills into ${skillsDir}`);
      } else {
        skillCache = [];
        return skillCache;
      }
    }

    const markdownFiles = findMarkdownFiles(skillsDir);
    const skills = [];

    for (const filePath of markdownFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      try {
        const parsed = matter(content);
        
        if (!parsed.data.name || !parsed.data.description) {
          continue;
        }
        
        skills.push({
          filename: path.basename(filePath),
          name: parsed.data.name,
          description: parsed.data.description,
          trigger: parsed.data.trigger || 'CONDITIONAL',
          content: parsed.content
        });
      } catch (e: any) {
        console.error(`[Scout] Failed to parse skill file ${filePath}: ${e.message}. Skipping.`);
      }
    }

    skillCache = skills;
    allSkills = skills;
  }

  if (!taskDescription) {
    return allSkills;
  }

  const activeSkills = [];
  const words = taskDescription.toLowerCase().split(/\\W+/).filter(w => w.length > 3);
  
  for (const skill of allSkills) {
    if (skill.trigger === 'ALWAYS') {
      activeSkills.push({ ...skill, _score: 999 });
      continue;
    }
    
    let score = 0;
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
  
  return activeSkills.slice(0, 8).map(s => {
    const { _score, ...rest } = s;
    return rest;
  });
}
