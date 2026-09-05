import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSecret } from './secrets.ts';

export class IdempotencyService {
  
  private getClient(authHeader?: string) {
    const SUPABASE_URL = getSecret('SUPABASE_URL');
    if (authHeader) {
      const SUPABASE_ANON_KEY = getSecret('SUPABASE_ANON_KEY');
      return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } }
      });
    }
    // Fallback for autonomous worker
    const SUPABASE_SERVICE_ROLE_KEY = getSecret('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for autonomous operations.');
    }
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }

  /**
   * Deterministic canonicalization function:
   * SHA-256(repository + issue_number + engagement_intent + normalized_comment)
   */
  async generateIdempotencyKey(repo: string, issueNumber: number, intent: string, draft: string): Promise<string> {
    const normalizedComment = draft.trim().replace(/\s+/g, ' ');
    const payload = `${repo}:${issueNumber}:${intent}:${normalizedComment}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Attempts to insert the idempotency key into the database.
   * If it already exists, the UNIQUE constraint will throw, failing closed.
   */
  async checkAndLockEngagement(
    authHeader: string | undefined,
    userId: string,
    repoName: string,
    issueNumber: number,
    intent: string,
    draft: string
  ): Promise<string> {
    const key = await this.generateIdempotencyKey(repoName, issueNumber, intent, draft);
    const supabase = this.getClient(authHeader);

    const { data, error } = await supabase
      .from('engagement_log')
      .insert({
        user_id: userId,
        repo_name: repoName,
        issue_number: issueNumber,
        intent: intent,
        idempotency_key: key
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Postgres unique violation code
        throw new Error(`IDEMPOTENCY_ERROR: This engagement has already been attempted.`);
      }
      throw new Error(`Idempotency Lock Error: ${error.message}`);
    }

    return key;
  }

  /**
   * Records the final GitHub comment ID after a successful post.
   */
  async recordSuccessfulEngagement(
    authHeader: string | undefined,
    key: string,
    githubCommentId: string
  ): Promise<void> {
    const supabase = this.getClient(authHeader);

    const { error } = await supabase
      .from('engagement_log')
      .update({ github_comment_id: githubCommentId })
      .eq('idempotency_key', key);

    if (error) throw new Error(`Idempotency Update Error: ${error.message}`);
  }
}

export const idempotencyService = new IdempotencyService();
