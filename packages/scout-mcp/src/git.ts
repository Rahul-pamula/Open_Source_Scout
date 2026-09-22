import { exec } from 'child_process';
import { promisify } from 'util';

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

export async function checkDirtyWorkingTree(cwd: string = process.cwd()) {
  const { stdout } = await execAsync('git status --porcelain', { cwd });
  if (stdout.trim().length > 0) {
    throw new Error('Working tree is dirty. Commit or stash changes before starting.');
  }
}
