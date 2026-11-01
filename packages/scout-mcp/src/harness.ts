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

  // Preserve critical execution paths and system environments
  const pathVar = rawEnv.PATH || rawEnv.Path || rawEnv.path;
  if (pathVar && !sanitized.PATH && !sanitized.Path) {
    if (process.platform === 'win32') sanitized.Path = pathVar;
    else sanitized.PATH = pathVar;
  }
  if (rawEnv.HOME && !sanitized.HOME) sanitized.HOME = rawEnv.HOME;
  if (rawEnv.USERPROFILE && !sanitized.USERPROFILE) sanitized.USERPROFILE = rawEnv.USERPROFILE;
  if (rawEnv.SHELL && !sanitized.SHELL) sanitized.SHELL = rawEnv.SHELL;
  if (rawEnv.SystemRoot && !sanitized.SystemRoot) sanitized.SystemRoot = rawEnv.SystemRoot;
  if (rawEnv.SystemDrive && !sanitized.SystemDrive) sanitized.SystemDrive = rawEnv.SystemDrive;
  if (rawEnv.COMSPEC && !sanitized.COMSPEC) sanitized.COMSPEC = rawEnv.COMSPEC;
  if (rawEnv.ComSpec && !sanitized.ComSpec) sanitized.ComSpec = rawEnv.ComSpec;
  if (rawEnv.PATHEXT && !sanitized.PATHEXT) sanitized.PATHEXT = rawEnv.PATHEXT;

  return sanitized;
}

/**
 * Resolves the appropriate shell binary and argument vector based on OS platform.
 */
export function resolveShellCommand(
  command: string,
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
): { shellBinary: string; shellArgs: string[] } {
  if (platform === 'win32') {
    const comSpec = env.ComSpec || env.COMSPEC || 'cmd.exe';
    return {
      shellBinary: comSpec,
      shellArgs: ['/d', '/s', '/c', command],
    };
  }
  return {
    shellBinary: 'sh',
    shellArgs: ['-c', command],
  };
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
      const { shellBinary, shellArgs } = resolveShellCommand(command);
      const isCmd = process.platform === 'win32' || shellBinary.toLowerCase().endsWith('cmd.exe');
      const spawnArgs = isCmd ? ['/d', '/s', '/c', `"${command}"`] : shellArgs;
      const child = spawn(shellBinary, spawnArgs, {
        cwd,
        shell: false,
        env: childEnv,
        windowsVerbatimArguments: isCmd,
      });
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
            if (err && !err.message?.includes('not found') && (err as any).code !== 128) {
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
