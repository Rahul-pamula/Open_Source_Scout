import { createClient } from '@supabase/supabase-js';
import type { AutonomyPolicy } from '../types.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export class AutonomyPolicyService {
  
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
   * Fetches the autonomy policy for a given user.
   * If not found, returns a safe default.
   */
  async getPolicy(userId: string, authHeader?: string): Promise<AutonomyPolicy> {
    const supabase = this.getClient(authHeader);

    const { data, error } = await supabase
      .from('autonomy_policy')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "No rows found"
      throw new Error(`Policy Fetch Error: ${error.message}`);
    }

    if (data) {
      return {
        level: data.level,
        enabled: data.enabled,
        allowedRepositories: data.allowed_repositories || [],
        allowedIntents: data.allowed_intents || [],
        minimumMatchScore: data.minimum_match_score,
        maximumDailyEngagements: data.maximum_daily_engagements,
        cooldownMinutes: data.cooldown_minutes,
        requireNoClaimant: data.require_no_claimant
      };
    }

    // Safe fallback default
    return {
      level: 'L1',
      enabled: false,
      allowedRepositories: [],
      allowedIntents: [],
      minimumMatchScore: 85,
      maximumDailyEngagements: 0,
      cooldownMinutes: 1440,
      requireNoClaimant: true
    };
  }
}

export const autonomyPolicyService = new AutonomyPolicyService();
