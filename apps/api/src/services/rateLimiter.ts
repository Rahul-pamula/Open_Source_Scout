import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Configurable Limits
const GLOBAL_DAILY_LIMIT = parseInt(process.env.SCOUT_GLOBAL_DAILY_LIMIT || '5', 10);
const REPO_DAILY_LIMIT = parseInt(process.env.SCOUT_REPO_DAILY_LIMIT || '2', 10);
const REPO_COOLDOWN_MINUTES = parseInt(process.env.SCOUT_REPO_COOLDOWN_MINUTES || '30', 10);
const HARD_GLOBAL_DAILY_BUDGET = parseInt(process.env.SCOUT_HARD_GLOBAL_DAILY_BUDGET || '50', 10);

export class RateLimiterService {
  
  private getClient(authHeader?: string) {
    if (authHeader) {
      return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } }
      });
    }
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for autonomous operations.');
    }
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }

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

    if ((systemCount || 0) >= HARD_GLOBAL_DAILY_BUDGET) {
      throw new Error(`DAILY_AUTONOMOUS_BUDGET_EXHAUSTED: System global daily budget of ${HARD_GLOBAL_DAILY_BUDGET} reached.`);
    }

    const engagements = recentEngagements || [];

    // 2. User Global Daily Limit
    if (engagements.length >= GLOBAL_DAILY_LIMIT) {
      throw new Error(`AUTONOMOUS_RATE_LIMIT_REACHED: Global daily limit of ${GLOBAL_DAILY_LIMIT} engagements reached.`);
    }

    const repoEngagements = engagements.filter(e => e.repo_name === repoName);

    // 2. Repo Daily Limit
    if (repoEngagements.length >= REPO_DAILY_LIMIT) {
      throw new Error(`AUTONOMOUS_RATE_LIMIT_REACHED: Repository daily limit of ${REPO_DAILY_LIMIT} engagements reached for ${repoName}.`);
    }

    // 3. Repo Cooldown
    if (repoEngagements.length > 0) {
      const mostRecent = new Date(repoEngagements[0].created_at).getTime();
      const now = Date.now();
      const minutesSinceLastEngagement = (now - mostRecent) / (1000 * 60);

      if (minutesSinceLastEngagement < REPO_COOLDOWN_MINUTES) {
        throw new Error(`AUTONOMOUS_RATE_LIMIT_REACHED: Repository cooldown active for ${repoName}. Must wait ${Math.ceil(REPO_COOLDOWN_MINUTES - minutesSinceLastEngagement)} more minutes.`);
      }
    }
  }
}

export const rateLimiterService = new RateLimiterService();
