/**
 * scout://skills MCP Resource.
 * Exposes active development skills, guidelines, and project conventions in JSON format.
 */

import { loadSkills } from '../skills.js';

export const SKILLS_RESOURCE_URI = 'scout://skills';

/**
 * Checks if the given URI matches the skills resource URI.
 */
export function isSkillsResourceUri(uri: string): boolean {
  return uri === SKILLS_RESOURCE_URI;
}

/**
 * Reads and formats active project skills as application/json.
 */
export async function readSkillsResource(
  repoCwd: string = process.cwd(),
): Promise<{ uri: string; mimeType: string; text: string }> {
  const skills = await loadSkills(undefined, repoCwd);

  const payload = {
    count: skills.length,
    skills: skills.map((s) => ({
      name: s.name,
      filename: s.filename,
      description: s.description,
      trigger: s.trigger,
      tags: s.tags || [],
      languages: s.languages || [],
      content: s.content,
    })),
  };

  return {
    uri: SKILLS_RESOURCE_URI,
    mimeType: 'application/json',
    text: JSON.stringify(payload, null, 2),
  };
}
