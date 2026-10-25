import { supabase } from './supabase';
import { normalizeDocUrl, isValidWebUrl } from '../utils/urlHelpers';

export interface NotesPersistResult {
  success: boolean;
  normalizedUrl: string;
  data?: any;
  error?: string;
}

/**
 * Validates and normalizes candidate preparation notes URL.
 */
export function validateAndNormalizeNotesUrl(rawUrl: string): {
  valid: boolean;
  normalizedUrl: string;
  error?: string;
} {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { valid: true, normalizedUrl: '' };
  }

  const normalized = normalizeDocUrl(trimmed);
  if (!isValidWebUrl(normalized)) {
    return {
      valid: false,
      normalizedUrl: '',
      error: 'Please enter a valid HTTP or HTTPS document URL.',
    };
  }

  return { valid: true, normalizedUrl: normalized };
}

/**
 * Persists candidate's interview preparation notes URL for a pipeline task.
 */
export async function persistInterviewNotes(
  taskId: string,
  rawUrl: string,
): Promise<NotesPersistResult> {
  if (!taskId) {
    return {
      success: false,
      normalizedUrl: '',
      error: 'Missing taskId.',
    };
  }

  const { valid, normalizedUrl, error: validationError } = validateAndNormalizeNotesUrl(rawUrl);

  if (!valid) {
    return {
      success: false,
      normalizedUrl: '',
      error: validationError || 'Invalid URL format.',
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('tracking', {
      body: {
        action: 'update_notes_url',
        id: taskId,
        interview_notes_url: normalizedUrl,
      },
    });

    if (error) {
      return {
        success: false,
        normalizedUrl,
        error: error.message || 'Failed to persist interview notes.',
      };
    }

    return {
      success: true,
      normalizedUrl,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      normalizedUrl,
      error: err.message || 'Network error while persisting notes.',
    };
  }
}

/**
 * Fetches the current interview preparation notes URL for a task.
 */
export async function fetchInterviewNotes(taskId: string): Promise<string | null> {
  if (!taskId) return null;

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('interview_notes_url')
      .eq('id', taskId)
      .maybeSingle();

    if (error || !data) return null;
    return data.interview_notes_url || null;
  } catch {
    return null;
  }
}
