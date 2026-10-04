import { ICloudAdapter } from './CloudAdapter.js';
import {
  getSupabaseClient,
  getOrCreateTaskSession,
  updateSessionStatus,
  checkSubmitIdempotency,
  processMarkBlocked,
  getUserIdFromJwt,
  updateSessionHeartbeat,
} from '../supabase.js';

export class SupabaseCloudAdapter implements ICloudAdapter {
  private async getClientAndUser() {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    
    if (!process.env.SCOUT_USER_JWT) return null;
    
    try {
      const userId = await getUserIdFromJwt(process.env.SCOUT_USER_JWT);
      return { supabase, userId };
    } catch {
      return null;
    }
  }

  async syncSession(sessionId: string, taskId?: string): Promise<void> {
    if (!taskId) return;
    const ctx = await this.getClientAndUser();
    if (!ctx) return;
    await getOrCreateTaskSession(ctx.supabase, taskId, ctx.userId, '');
  }

  async syncHeartbeat(sessionId: string): Promise<void> {
    const ctx = await this.getClientAndUser();
    if (!ctx) return;
    await updateSessionHeartbeat(ctx.supabase, sessionId, ctx.userId);
  }

  async syncSubmit(sessionId: string, prUrl?: string): Promise<void> {
    const ctx = await this.getClientAndUser();
    if (!ctx) return;
    const isIdempotentCloud = await checkSubmitIdempotency(ctx.supabase, sessionId, ctx.userId);
    if (!isIdempotentCloud) {
      await updateSessionStatus(ctx.supabase, sessionId, ctx.userId, 'SUBMITTED', 'ACTIVE', prUrl);
    }
  }

  async syncBlocked(sessionId: string, reason: string): Promise<void> {
    const ctx = await this.getClientAndUser();
    if (!ctx) return;
    await processMarkBlocked(ctx.supabase, sessionId, ctx.userId);
  }
}
