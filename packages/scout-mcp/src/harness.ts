import { spawn, ChildProcess } from 'child_process';
import treeKill from 'tree-kill';

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class ProcessManager {
  private activeProcesses: Map<string, ChildProcess[]> = new Map();

  public runCommand(
    sessionId: string,
    command: string,
    cwd: string,
    timeoutMs: number = 600000
  ): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, { cwd, shell: true });
      let timeoutId: NodeJS.Timeout | undefined;

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
        import('./evidence.js').then(({ recordCommand }) => {
          recordCommand(sessionId, command, code, new Date().toISOString()).catch(console.error);
        });
        resolve({ stdout, stderr, exitCode: code });
      };

      child.on('exit', onExit);

      child.on('error', (err) => {
        cleanupTimeout();
        this.removeProcess(sessionId, child);
        import('./evidence.js').then(({ recordCommand }) => {
          recordCommand(sessionId, command, null, new Date().toISOString()).catch(console.error);
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
