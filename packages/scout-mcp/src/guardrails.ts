import path from 'path';

export class GuardrailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GuardrailError';
  }
}

export function validatePathBoundary(worktreePath: string, targetPath: string): string {
  const absoluteWorktree = path.resolve(worktreePath);
  const absoluteTarget = path.resolve(absoluteWorktree, targetPath);
  
  if (absoluteTarget !== absoluteWorktree && !absoluteTarget.startsWith(absoluteWorktree + path.sep)) {
    throw new GuardrailError(`Path boundary violation. Access to ${targetPath} is strictly forbidden outside of the worktree.`);
  }
  
  return absoluteTarget;
}
