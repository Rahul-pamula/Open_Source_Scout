import { getSecret } from './secrets.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { AutonomyLevel } from './types.ts';

const SUPABASE_URL = getSecret('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = getSecret('SUPABASE_SERVICE_ROLE_KEY') || '';

export interface AuditEventData {
  repoName: string;
  issueNumber: number;
  intent: string;
  draft?: string;
  autonomyLevel: AutonomyLevel;
  safetyDecision: any;
  result: 'SUCCESS' | 'BLOCKED' | 'ERROR';
  failureReason?: string;
}

export class AuditService {
  private getClient() {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for autonomous operations.');
    }
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }

  async logEvent(data: AuditEventData): Promise<void> {
    const supabase = this.getClient();
    
    const { error } = await supabase
      .from('audit_events')
      .insert({
        repo_name: data.repoName,
        issue_number: data.issueNumber,
        intent: data.intent,
        draft: data.draft,
        autonomy_level: data.autonomyLevel,
        safety_decision: data.safetyDecision,
        result: data.result,
        failure_reason: data.failureReason
      });

    if (error) {
      console.error('[scout-api] Failed to log audit event:', error);
    }
  }
}

export const auditService = new AuditService();
