import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

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

export function loadSkills(cwd: string = process.cwd()) {
  const skillsDir = path.join(cwd, '.scout', 'skills');
  if (!fs.existsSync(skillsDir)) {
    return [];
  }

  const markdownFiles = findMarkdownFiles(skillsDir);
  const skills = [];

  for (const filePath of markdownFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    try {
      // gray-matter gracefully handles files without frontmatter by returning empty data
      const parsed = matter(content);
      
      // We only consider files valid skills if they have the required frontmatter
      if (!parsed.data.name || !parsed.data.description) {
        // Skip files that aren't actually skills (like READMEs)
        continue;
      }
      
      skills.push({
        filename: path.basename(filePath),
        name: parsed.data.name,
        description: parsed.data.description,
        content: parsed.content
      });
    } catch (e: any) {
      throw new Error(`Failed to parse skill file ${filePath}: ${e.message}`);
    }
  }

  return skills;
}
