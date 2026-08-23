import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export class LockService {
  
  private getClient() {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for execution locks.');
    }
    // We always use service role for execution locks as they run in background context
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }

  /**
   * Attempts to acquire an exclusive execution lock.
   * Locks expire after `ttlMinutes` to prevent deadlocks if a worker crashes.
   */
  async acquireLock(key: string, ttlMinutes: number = 5): Promise<boolean> {
    const supabase = this.getClient();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

    // 1. Try to insert a brand new lock
    const { error: insertError } = await supabase
      .from('execution_locks')
      .insert({ lock_key: key, expires_at: expiresAt });

    if (!insertError) {
      return true; // Successfully acquired new lock
    }

    // 2. If it already exists, check if it has expired and try to claim it
    if (insertError.code === '23505') { // Postgres Unique Violation
      const now = new Date().toISOString();
      const { data, error: updateError } = await supabase
        .from('execution_locks')
        .update({ expires_at: expiresAt })
        .eq('lock_key', key)
        .lte('expires_at', now) // Only update if it has expired! (Race condition safe)
        .select();

      if (!updateError && data && data.length > 0) {
        return true; // Successfully claimed an expired lock
      }
    }

    return false; // Lock is currently held by someone else
  }

  /**
   * Releases an execution lock early upon successful completion.
   */
  async releaseLock(key: string): Promise<void> {
    const supabase = this.getClient();
    await supabase.from('execution_locks').delete().eq('lock_key', key);
  }
}

export const lockService = new LockService();
