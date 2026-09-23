import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const userJwt = process.env.SCOUT_USER_JWT;

  if (!url || !anonKey || !userJwt) {
    return null;
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
    if (latest.status === 'SUBMITTED') {
      throw new Error('Task is already submitted / awaiting external review');
    }
    if (latest.status === 'BLOCKED') {
      // Option A: Blocked session is terminal, allow falling through to create a new active session.
    } else if (latest.status === 'ACTIVE') {
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
      status: 'ACTIVE'
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
        .eq('status', 'ACTIVE')
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

export async function updateSessionStatus(supabase: SupabaseClient, sessionId: string, userId: string, newStatus: string, expectedOldStatus: string, prUrl?: string) {
  const { data, error } = await supabase
    .from('task_sessions')
    .update({ status: newStatus })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .eq('status', expectedOldStatus)
    .select('id, task_id');
    
  if (error) {
    throw new Error(`Failed to update session status: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(`State transition rejected: session not found, wrong user, or state changed concurrently`);
  }

  if (prUrl) {
    const taskId = data[0].task_id;
    await supabase
      .from('tasks')
      .update({ pr_url: prUrl })
      .eq('id', taskId)
      .eq('user_id', userId);
  }
}

export async function checkSubmitIdempotency(supabase: SupabaseClient, sessionId: string, userId: string): Promise<boolean> {
  const currentStatus = await getSessionStatus(supabase, sessionId, userId);
  
  if (currentStatus === 'BLOCKED') {
    throw new Error('State transition rejected: cannot submit a blocked session');
  }

  return currentStatus === 'SUBMITTED';
}

export async function processMarkBlocked(supabase: SupabaseClient, sessionId: string, userId: string): Promise<{ idempotent: boolean }> {
  const currentStatus = await getSessionStatus(supabase, sessionId, userId);

  if (currentStatus === 'SUBMITTED') {
    throw new Error('State transition rejected: cannot block an already submitted session');
  }

  if (currentStatus === 'BLOCKED') {
    return { idempotent: true };
  }

  await updateSessionStatus(supabase, sessionId, userId, 'BLOCKED', 'ACTIVE');
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

export async function updateSessionHeartbeat(supabase: SupabaseClient, sessionId: string, userId: string) {
  const { error } = await supabase
    .from('task_sessions')
    .update({ last_heartbeat_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .eq('status', 'ACTIVE');
    
  if (error) {
    throw new Error(`Failed to update session heartbeat: ${error.message}`);
  }
}
