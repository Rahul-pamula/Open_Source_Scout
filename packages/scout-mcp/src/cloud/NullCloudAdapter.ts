import { ICloudAdapter } from './CloudAdapter.js';

export class NullCloudAdapter implements ICloudAdapter {
  async syncSession(sessionId: string, taskId?: string): Promise<void> {}
  async syncHeartbeat(sessionId: string): Promise<void> {}
  async syncSubmit(sessionId: string, prUrl?: string): Promise<void> {}
  async syncBlocked(sessionId: string, reason: string): Promise<void> {}
}
