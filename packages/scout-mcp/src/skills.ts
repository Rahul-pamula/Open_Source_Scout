import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export function loadSkills(cwd: string = process.cwd()) {
  const skillsDir = path.join(cwd, '.scout', 'skills');
  if (!fs.existsSync(skillsDir)) {
    return [];
  }

  const files = fs.readdirSync(skillsDir);
  const skills = [];

  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    
    const filePath = path.join(skillsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    try {
      const parsed = matter(content);
      if (!parsed.data.name || !parsed.data.description) {
        throw new Error('Missing required frontmatter (name, description)');
      }
      
      skills.push({
        filename: file,
        name: parsed.data.name,
        description: parsed.data.description,
        content: parsed.content
      });
    } catch (e: any) {
      throw new Error(`Failed to parse skill file ${file}: ${e.message}`);
    }
  }

  return skills;
}
