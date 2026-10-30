/**
 * Real-time progress token resolution and notification emission for Scout MCP.
 * Implements MCP specification for notifications/progress.
 */

export type ProgressCallback = (
  progress: number,
  total?: number,
  message?: string,
) => Promise<void> | void;

export interface NotificationSender {
  notification(msg: {
    method: string;
    params: {
      progressToken: string | number;
      progress: number;
      total?: number;
      message?: string;
    };
  }): Promise<void>;
}

/**
 * Resolves progressToken from standard MCP _meta.progressToken or tool arguments.progress_token.
 */
export function resolveProgressToken(params?: {
  _meta?: { progressToken?: string | number; [key: string]: unknown };
  arguments?: Record<string, unknown>;
}): string | number | undefined {
  if (!params) return undefined;
  if (params._meta?.progressToken !== undefined && params._meta?.progressToken !== null) {
    return params._meta.progressToken;
  }
  if (
    params.arguments &&
    params.arguments.progress_token !== undefined &&
    params.arguments.progress_token !== null
  ) {
    const pt = params.arguments.progress_token;
    if (typeof pt === 'string' || typeof pt === 'number') {
      return pt;
    }
  }
  return undefined;
}

/**
 * Emits an MCP notifications/progress event safely to the client.
 */
export async function emitProgressNotification(
  sender: NotificationSender,
  progressToken: string | number | undefined,
  progress: number,
  total?: number,
  message?: string,
): Promise<void> {
  if (progressToken === undefined || progressToken === null) return;
  try {
    await sender.notification({
      method: 'notifications/progress',
      params: {
        progressToken,
        progress,
        ...(total !== undefined ? { total } : {}),
        ...(message !== undefined ? { message } : {}),
      },
    });
  } catch {
    // Non-fatal if transport is disconnected or client doesn't support progress notifications
  }
}

/**
 * Creates an optional progress callback wired to the MCP server.
 */
export function createProgressCallback(
  sender: NotificationSender,
  progressToken?: string | number,
): ProgressCallback | undefined {
  if (progressToken === undefined || progressToken === null) return undefined;
  return async (progress: number, total?: number, message?: string) => {
    await emitProgressNotification(sender, progressToken, progress, total, message);
  };
}
