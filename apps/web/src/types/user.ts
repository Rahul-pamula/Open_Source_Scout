export type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Senior';

export interface UserProfile {
  bio: string;
  skills: string[];
  github_handle: string;
  automation_count_today: number;
  last_automation_date: string;
  custom_comment_enabled: boolean;
  custom_comment_text: string | null;
  experience_level?: ExperienceLevel;
}

export function normalizeExperienceLevel(level: unknown): ExperienceLevel {
  if (level === 'Intermediate' || level === 'Senior') {
    return level;
  }
  return 'Beginner';
}
