import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSecret } from './secrets.ts';

export class RateLimiterService {
  
  private getClient(authHeader?: string) {
    const SUPABASE_URL = getSecret('SUPABASE_URL');
    if (authHeader) {
      const SUPABASE_ANON_KEY = getSecret('SUPABASE_ANON_KEY');
      return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } }
      });
    }
    const SUPABASE_SERVICE_ROLE_KEY = getSecret('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for autonomous operations.');
    }
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }

  // Configurable Limits
  private get GLOBAL_DAILY_LIMIT() { return parseInt(Deno.env.get('SCOUT_GLOBAL_DAILY_LIMIT') || '5', 10); }
  private get REPO_DAILY_LIMIT() { return parseInt(Deno.env.get('SCOUT_REPO_DAILY_LIMIT') || '2', 10); }
  private get REPO_COOLDOWN_MINUTES() { return parseInt(Deno.env.get('SCOUT_REPO_COOLDOWN_MINUTES') || '30', 10); }
  private get HARD_GLOBAL_DAILY_BUDGET() { return parseInt(Deno.env.get('SCOUT_HARD_GLOBAL_DAILY_BUDGET') || '50', 10); }

  /**
   * Evaluates application-level autonomous engagement limits.
   * Throws an error if any limit is exceeded.
   */
  async checkRateLimits(
    authHeader: string | undefined,
    userId: string,
    repoName: string
  ): Promise<void> {
    const supabase = this.getClient(authHeader);

    // Fetch user engagements from the past 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentEngagements, error } = await supabase
      .from('engagement_log')
      .select('repo_name, created_at')
      .eq('user_id', userId)
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Rate Limiter DB Error: ${error.message}`);
    }

    // 1. Hard Global Budget (across ALL users)
    const { count: systemCount, error: systemError } = await supabase
      .from('engagement_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo);

    if (systemError) {
      throw new Error(`Rate Limiter System DB Error: ${systemError.message}`);
    }

    if ((systemCount || 0) >= this.HARD_GLOBAL_DAILY_BUDGET) {
      throw new Error(`DAILY_AUTONOMOUS_BUDGET_EXHAUSTED: System global daily budget of ${this.HARD_GLOBAL_DAILY_BUDGET} reached.`);
    }

    const engagements = recentEngagements || [];

    // 2. User Global Daily Limit
    if (engagements.length >= this.GLOBAL_DAILY_LIMIT) {
      throw new Error(`AUTONOMOUS_RATE_LIMIT_REACHED: Global daily limit of ${this.GLOBAL_DAILY_LIMIT} engagements reached.`);
    }

    const repoEngagements = engagements.filter(e => e.repo_name === repoName);

    // 2. Repo Daily Limit
    if (repoEngagements.length >= this.REPO_DAILY_LIMIT) {
      throw new Error(`AUTONOMOUS_RATE_LIMIT_REACHED: Repository daily limit of ${this.REPO_DAILY_LIMIT} engagements reached for ${repoName}.`);
    }

    // 3. Repo Cooldown
    if (repoEngagements.length > 0) {
      const mostRecent = new Date(repoEngagements[0].created_at).getTime();
      const now = Date.now();
      const minutesSinceLastEngagement = (now - mostRecent) / (1000 * 60);

      if (minutesSinceLastEngagement < this.REPO_COOLDOWN_MINUTES) {
        throw new Error(`AUTONOMOUS_RATE_LIMIT_REACHED: Repository cooldown active for ${repoName}. Must wait ${Math.ceil(this.REPO_COOLDOWN_MINUTES - minutesSinceLastEngagement)} more minutes.`);
      }
    }
  }
}

export const rateLimiterService = new RateLimiterService();
