import { exec } from 'child_process';
import { promisify } from 'util';
import { join, resolve } from 'path';
import { rm, readdir, mkdir } from 'fs/promises';
import { getLocalState } from './localState.js';

const execAsync = promisify(exec);

export async function getGitInfo(cwd: string = process.cwd()) {
  try {
    // Check if it's a git repo
    await execAsync('git rev-parse --is-inside-work-tree', { cwd });
  } catch (e) {
    throw new Error('Not a git repository.');
  }

  try {
    const { stdout: originOut } = await execAsync('git remote get-url origin', { cwd });
    let remoteUrl = originOut.trim();
    
    // Normalize SSH to HTTPS
    if (remoteUrl.startsWith('git@github.com:')) {
      remoteUrl = remoteUrl.replace('git@github.com:', 'https://github.com/');
    }
    if (remoteUrl.endsWith('.git')) {
      remoteUrl = remoteUrl.slice(0, -4);
    }
    
    const { stdout: branchOut } = await execAsync('git branch --show-current', { cwd });
    const branch = branchOut.trim();
    if (!branch) {
      throw new Error('Detached HEAD state. Please checkout a branch.');
    }

    const { stdout: commitOut } = await execAsync('git rev-parse HEAD', { cwd });
    const commitHash = commitOut.trim();

    return {
      remoteUrl,
      branch,
      commitHash
    };
  } catch (e: any) {
    throw new Error(`Git error: ${e.message}`);
  }
}

/**
 * Executes a git command with retry backoff when git lockfile races
 * (index.lock, worktrees/locked, concurrent git process) occur.
 */
export async function execWithGitLockRetry(
  command: string,
  options: { cwd: string; maxRetries?: number; delayMs?: number },
): Promise<{ stdout: string; stderr: string }> {
  const maxRetries = options.maxRetries ?? 5;
  let delay = options.delayMs ?? 100;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await execAsync(command, { cwd: options.cwd });
    } catch (err: any) {
      const msg = err.message || '';
      const isLockError =
        msg.includes('index.lock') ||
        msg.includes('.lock') ||
        msg.includes('locked') ||
        msg.includes('Another git process') ||
        msg.includes('worktrees');

      if (isLockError && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay + Math.random() * 50));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Command failed after ${maxRetries} lock retries: ${command}`);
}

export async function createWorktree(sessionId: string, cwd: string = process.cwd()): Promise<string> {
  const repoRootOut = await execAsync('git rev-parse --show-toplevel', { cwd });
  const repoRoot = repoRootOut.stdout.trim();
  
  const worktreePath = join(repoRoot, '.scout-tmp', 'worktrees', sessionId);
  const branchName = `scout-session-${sessionId}`;
  
  try {
    const { stdout } = await execAsync('git worktree list', { cwd });
    if (stdout.includes(worktreePath)) {
      return worktreePath;
    }
  } catch(e) {}

  await removeWorktree(sessionId, cwd);

  try {
    const gitDirOut = await execAsync('git rev-parse --git-dir', { cwd });
    const gitDir = resolve(cwd, gitDirOut.stdout.trim());
    await mkdir(join(gitDir, 'worktrees'), { recursive: true });
  } catch (_) {}

  try {
    await execWithGitLockRetry(`git worktree add -b ${branchName} ${worktreePath}`, { cwd });
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      try {
        await execWithGitLockRetry(`git worktree add ${worktreePath} ${branchName}`, { cwd });
      } catch (innerE: any) {
         throw new Error(`Failed to create worktree: ${innerE.message}`);
      }
    } else {
      throw new Error(`Failed to create worktree: ${e.message}`);
    }
  }

  return worktreePath;
}

export async function removeWorktree(sessionId: string, cwd: string = process.cwd()): Promise<void> {
  const repoRootOut = await execAsync('git rev-parse --show-toplevel', { cwd });
  const repoRoot = repoRootOut.stdout.trim();
  
  const worktreePath = join(repoRoot, '.scout-tmp', 'worktrees', sessionId);
  const branchName = `scout-session-${sessionId}`;

  try {
    await execWithGitLockRetry(`git worktree remove --force ${worktreePath}`, { cwd });
  } catch (e) {
    await rm(worktreePath, { recursive: true, force: true }).catch(() => {});
    await execWithGitLockRetry(`git worktree prune`, { cwd }).catch(() => {});
  }

  try {
    await execWithGitLockRetry(`git branch -D ${branchName}`, { cwd });
  } catch (e) {
    // Ignore
  }
}

export async function checkDirtyWorkingTree(cwd: string = process.cwd()) {
  const { stdout } = await execAsync('git status --porcelain', { cwd });
  if (stdout.trim().length > 0) {
    throw new Error('Working tree is dirty. Commit or stash changes before starting.');
  }
}

export async function getWorktreePath(sessionId: string, cwd: string = process.cwd()): Promise<string> {
  const { stdout } = await execAsync('git rev-parse --show-toplevel', { cwd });
  return join(stdout.trim(), '.scout-tmp', 'worktrees', sessionId);
}

export async function cleanupOrphanedWorktrees(cwd: string = process.cwd()): Promise<void> {
  let repoRoot = '';
  try {
    const repoRootOut = await execAsync('git rev-parse --show-toplevel', { cwd });
    repoRoot = repoRootOut.stdout.trim();
  } catch (e) { return; }
  
  const worktreesDir = join(repoRoot, '.scout-tmp', 'worktrees');
  
  let stateSessions: string[] = [];
  try {
    const state = await getLocalState(cwd);
    stateSessions = Object.entries(state.sessions)
        .map(([id]) => id);
  } catch(e) {}

  let dirs: string[] = [];
  try {
    const entries = await readdir(worktreesDir, { withFileTypes: true });
    dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch(e) {}

  let branches: string[] = [];
  try {
    const { stdout } = await execAsync('git branch --list "scout-session-*"', { cwd });
    branches = stdout.split('\n')
      .map(b => b.replace('*', '').trim())
      .filter(b => b.length > 0)
      .map(b => b.replace('scout-session-', ''));
  } catch(e) {}

  const allPossibleSessions = new Set([...dirs, ...branches]);
  
  for (const sessionId of allPossibleSessions) {
    if (!stateSessions.includes(sessionId)) {
      await removeWorktree(sessionId, cwd);
    }
  }
}


export async function getGitDiff(cwd: string = process.cwd()): Promise<string> {
  try {
    try {
      await execAsync('git add -N .', { cwd });
    } catch {}
    const { stdout } = await execAsync('git diff HEAD', { cwd });
    return stdout;
  } catch (e: any) {
    try {
      const { stdout } = await execAsync('git diff', { cwd });
      return stdout;
    } catch {
      return '';
    }
  }
}

export async function getChangedFiles(cwd: string = process.cwd()): Promise<string[]> {
  try {
    try {
      await execAsync('git add -N .', { cwd });
    } catch {}
    const { stdout } = await execAsync('git diff --name-only HEAD', { cwd });
    return stdout.trim().split('\n').filter(Boolean);
  } catch (e: any) {
    return [];
  }
}

export async function getWorktreeDiff(sessionId: string, cwd: string = process.cwd()): Promise<string> {
  try {
    const worktreePath = await getWorktreePath(sessionId, cwd);
    return await getGitDiff(worktreePath);
  } catch (e: any) {
    return '';
  }
}
