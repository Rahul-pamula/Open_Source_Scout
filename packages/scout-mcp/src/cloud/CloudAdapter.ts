export interface ICloudAdapter {
  syncSession(sessionId: string, taskId?: string): Promise<void>;
  syncHeartbeat(sessionId: string): Promise<void>;
  syncSubmit(sessionId: string, prUrl?: string): Promise<void>;
  syncBlocked(sessionId: string, reason: string): Promise<void>;
}
