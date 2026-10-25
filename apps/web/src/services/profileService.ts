import { supabase } from './supabase';
import type { UserProfile, ExperienceLevel } from '../types/user';
import { normalizeExperienceLevel } from '../types/user';

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select(
      'bio, skills, github_handle, automation_count_today, last_automation_date, custom_comment_enabled, custom_comment_text, experience_level',
    )
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('profileService.fetchUserProfile error:', error);
    throw error;
  }

  if (!data) return null;

  return {
    ...data,
    experience_level: normalizeExperienceLevel(data.experience_level),
  };
}

export async function updateUserExperienceLevel(
  userId: string,
  level: ExperienceLevel,
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ experience_level: level, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('profileService.updateUserExperienceLevel error:', error);
    throw error;
  }
}

export async function updateUserSkills(userId: string, skills: string[]): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ skills, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('profileService.updateUserSkills error:', error);
    throw error;
  }
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>,
): Promise<void> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.bio !== undefined) payload.bio = updates.bio;
  if (updates.github_handle !== undefined) payload.github_handle = updates.github_handle;
  if (updates.skills !== undefined) payload.skills = updates.skills;
  if (updates.experience_level !== undefined) {
    payload.experience_level = normalizeExperienceLevel(updates.experience_level);
  }
  if (updates.custom_comment_enabled !== undefined) {
    payload.custom_comment_enabled = updates.custom_comment_enabled;
  }
  if (updates.custom_comment_text !== undefined) {
    payload.custom_comment_text = updates.custom_comment_text;
  }

  const { error } = await supabase.from('users').update(payload).eq('id', userId);

  if (error) {
    console.error('profileService.updateUserProfile error:', error);
    throw error;
  }
}
