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
  if (typeof level !== 'string') return 'Beginner';
  const lower = level.trim().toLowerCase();
  if (lower === 'senior') return 'Senior';
  if (lower === 'intermediate') return 'Intermediate';
  return 'Beginner';
}

export function createDefaultUserProfile(
  user?: { user_metadata?: Record<string, any>; email?: string } | null,
): UserProfile {
  return {
    bio: '',
    skills: [],
    github_handle: user?.user_metadata?.user_name || user?.email?.split('@')[0] || '',
    automation_count_today: 0,
    last_automation_date: new Date().toISOString().split('T')[0],
    custom_comment_enabled: false,
    custom_comment_text: null,
    experience_level: 'Beginner',
  };
}
