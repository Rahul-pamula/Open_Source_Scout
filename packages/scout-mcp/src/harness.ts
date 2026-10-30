import { spawn, ChildProcess } from 'child_process';
import treeKill from 'tree-kill';

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Strips secrets, access tokens, and sensitive credential environment variables
 * before passing host environment to spawned child processes.
 */
export function sanitizeEnvironment(rawEnv: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const SENSITIVE_KEY_PATTERNS = [
    /TOKEN/i,
    /SECRET/i,
    /PASSWORD/i,
    /API_?KEY/i,
    /AUTH/i,
    /CREDENTIAL/i,
    /PRIVATE_?KEY/i,
    /^GH_/i,
    /^GITHUB_/i,
    /^AWS_/i,
    /^DATABASE_URL$/i,
    /^REDIS_URL$/i,
    /^LD_PRELOAD$/i,
    /^LD_LIBRARY_PATH$/i,
    /^DYLD_INSERT_LIBRARIES$/i,
    /^DYLD_LIBRARY_PATH$/i,
    /^NODE_OPTIONS$/i,
    /^PYTHONPATH$/i,
  ];

  for (const [key, value] of Object.entries(rawEnv)) {
    if (value === undefined) continue;
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (!isSensitive) {
      sanitized[key] = value;
    }
  }

  // Preserve critical execution paths
  if (rawEnv.PATH && !sanitized.PATH) sanitized.PATH = rawEnv.PATH;
  if (rawEnv.HOME && !sanitized.HOME) sanitized.HOME = rawEnv.HOME;
  if (rawEnv.SHELL && !sanitized.SHELL) sanitized.SHELL = rawEnv.SHELL;

  return sanitized;
}

export class ProcessManager {
  private activeProcesses: Map<string, ChildProcess[]> = new Map();

  public runCommand(
    sessionId: string,
    command: string,
    cwd: string,
    timeoutMs: number = 600000,
    customEnv?: Record<string, string>,
  ): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const startCpu = process.cpuUsage();
      const childEnv = customEnv ? { ...sanitizeEnvironment(), ...customEnv } : sanitizeEnvironment();
      const child = spawn('sh', ['-c', command], { cwd, shell: false, env: childEnv });
      let timeoutId: NodeJS.Timeout | undefined;

      const computeMetrics = () => {
        const duration_ms = Date.now() - startTime;
        const cpuDiff = process.cpuUsage(startCpu);
        const mem = process.memoryUsage();
        return {
          duration_ms,
          cpu_user_micros: cpuDiff.user,
          cpu_system_micros: cpuDiff.system,
          peak_memory_rss_bytes: mem.rss,
        };
      };

      if (!this.activeProcesses.has(sessionId)) {
        this.activeProcesses.set(sessionId, []);
      }
      this.activeProcesses.get(sessionId)!.push(child);

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const cleanupTimeout = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
      };

      const onExit = (code: number | null) => {
        cleanupTimeout();
        this.removeProcess(sessionId, child);
        const telemetry = computeMetrics();
        import('./evidence.js').then(({ recordCommand }) => {
          recordCommand(sessionId, command, code, new Date().toISOString(), telemetry).catch(console.error);
        });
        resolve({ stdout, stderr, exitCode: code });
      };

      child.on('exit', onExit);

      child.on('error', (err) => {
        cleanupTimeout();
        this.removeProcess(sessionId, child);
        const telemetry = computeMetrics();
        import('./evidence.js').then(({ recordCommand }) => {
          recordCommand(sessionId, command, null, new Date().toISOString(), telemetry).catch(console.error);
        });
        reject(err);
      });

      if (timeoutMs > 0) {
        timeoutId = setTimeout(() => {
          if (child.pid) {
            treeKill(child.pid, 'SIGKILL');
          }
          this.removeProcess(sessionId, child);
          reject(new TimeoutError(`Command timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }
    });
  }

  private removeProcess(sessionId: string, child: ChildProcess) {
    const processes = this.activeProcesses.get(sessionId);
    if (processes) {
      this.activeProcesses.set(
        sessionId,
        processes.filter((p) => p !== child)
      );
      if (this.activeProcesses.get(sessionId)!.length === 0) {
        this.activeProcesses.delete(sessionId);
      }
    }
  }

  public async cancelSession(sessionId: string): Promise<void> {
    const processes = this.activeProcesses.get(sessionId);
    if (!processes || processes.length === 0) {
      return;
    }

    const killPromises = processes.map((child) => {
      return new Promise<void>((resolve) => {
        if (child.pid) {
          treeKill(child.pid, 'SIGKILL', (err) => {
            if (err) {
              console.error(`Failed to kill process tree for PID ${child.pid}:`, err);
            }
            resolve();
          });
        } else {
          resolve();
        }
      });
    });

    await Promise.all(killPromises);
    this.activeProcesses.delete(sessionId);
  }

  public getActiveProcessCount(sessionId: string): number {
    return this.activeProcesses.get(sessionId)?.length || 0;
  }
}

export const processManager = new ProcessManager();
