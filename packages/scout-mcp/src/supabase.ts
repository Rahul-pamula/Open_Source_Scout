import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const userJwt = process.env.SCOUT_USER_JWT;

  if (!url || !anonKey) {
    throw new Error('Authentication Failed: Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  }

  if (!userJwt) {
    throw new Error('Authentication Failed: Missing SCOUT_USER_JWT token');
  }

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userJwt}`
      }
    }
  });
}

/**
 * Ensures at most one active session exists for a given task_id and user_id.
 * If an active session exists, it returns it.
 * Otherwise, it creates a new active session with the provided commit hash.
 */
export async function getOrCreateTaskSession(supabase: SupabaseClient, taskId: string, userId: string, commitHash: string): Promise<string> {
  // 1. Try to fetch existing latest session
  const { data: latest, error: fetchError } = await supabase
    .from('task_sessions')
    .select('id, starting_commit_hash, status')
    .eq('task_id', taskId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to query sessions: ${fetchError.message}`);
  }

  if (latest) {
    if (latest.status === 'submitted') {
      throw new Error('Task is already submitted / awaiting external review');
    }
    if (latest.status === 'blocked') {
      throw new Error('Task is already marked as blocked');
    }
    if (latest.status === 'active') {
      if (latest.starting_commit_hash !== commitHash) {
        throw new Error(`Stale session detected. Active session exists with commit ${latest.starting_commit_hash}, but current HEAD is ${commitHash}.`);
      }
      return latest.id;
    }
  }

  // 2. Insert new session.
  // The database unique index `unique_active_session_per_task` guarantees we don't insert duplicates.
  const { data: newSession, error: insertError } = await supabase
    .from('task_sessions')
    .insert({
      task_id: taskId,
      user_id: userId,
      starting_commit_hash: commitHash,
      status: 'active'
    })
    .select('id')
    .single();

  if (insertError) {
    // Check if it's a unique violation (meaning another process just inserted an active session)
    if (insertError.code === '23505') {
      // Retry fetch
      const { data: retryExisting } = await supabase
        .from('task_sessions')
        .select('id, starting_commit_hash, status')
        .eq('task_id', taskId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();
        
      if (retryExisting) {
        if (retryExisting.starting_commit_hash !== commitHash) {
          throw new Error(`Stale session detected. Active session exists with commit ${retryExisting.starting_commit_hash}, but current HEAD is ${commitHash}.`);
        }
        return retryExisting.id;
      }
    }
    throw new Error(`Failed to create task session: ${insertError.message}`);
  }

  return newSession.id;
}

export async function fetchTaskInfo(supabase: SupabaseClient, taskId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();
    
  if (error || !data) {
    throw new Error(`Failed to fetch task: ${error?.message || 'Not found'}`);
  }
  return data;
}

export async function getSessionStatus(supabase: SupabaseClient, sessionId: string, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('task_sessions')
    .select('status')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch session: ${error?.message || 'Not found'}`);
  }

  return data.status;
}

export async function updateSessionStatus(supabase: SupabaseClient, sessionId: string, userId: string, newStatus: string, expectedOldStatus: string) {
  const { data, error } = await supabase
    .from('task_sessions')
    .update({ status: newStatus })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .eq('status', expectedOldStatus)
    .select('id');
    
  if (error) {
    throw new Error(`Failed to update session status: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(`State transition rejected: session not found, wrong user, or state changed concurrently`);
  }
}

export async function processSubmitForReview(supabase: SupabaseClient, sessionId: string, userId: string): Promise<{ idempotent: boolean }> {
  const currentStatus = await getSessionStatus(supabase, sessionId, userId);
  
  if (currentStatus === 'blocked') {
    throw new Error('State transition rejected: cannot submit a blocked session');
  }

  if (currentStatus === 'submitted') {
    return { idempotent: true };
  }

  await updateSessionStatus(supabase, sessionId, userId, 'submitted', 'active');
  return { idempotent: false };
}

export async function processMarkBlocked(supabase: SupabaseClient, sessionId: string, userId: string): Promise<{ idempotent: boolean }> {
  const currentStatus = await getSessionStatus(supabase, sessionId, userId);

  if (currentStatus === 'submitted') {
    throw new Error('State transition rejected: cannot block an already submitted session');
  }

  if (currentStatus === 'blocked') {
    return { idempotent: true };
  }

  await updateSessionStatus(supabase, sessionId, userId, 'blocked', 'active');
  return { idempotent: false };
}

export async function getUserIdFromJwt(jwt: string): Promise<string> {
  // Very basic decoding to extract the subject (sub) which is the user_id in Supabase JWTs
  try {
    const payloadBase64 = jwt.split('.')[1];
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);
    if (!payload.sub) {
      throw new Error('Authentication Failed: SCOUT_USER_JWT has no sub claim');
    }
    return payload.sub;
  } catch (e: any) {
    if (e.message.startsWith('Authentication Failed:')) throw e;
    throw new Error('Authentication Failed: Malformed SCOUT_USER_JWT token');
  }
}
