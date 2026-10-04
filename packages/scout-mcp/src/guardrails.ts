export class CommandBoundaryGuard {
  static validate(command: string): void {
    // Split command by shell operators to check individual segments
    const segments = command.split(/(?:&&|\|\||;|\n|\|)/).map(s => s.trim()).filter(Boolean);

    for (const segment of segments) {
      if (segment.startsWith('cd ') || segment.startsWith('pushd ')) {
        const target = segment.slice(segment.indexOf(' ') + 1).trim();
        
        // Prevent traversing up
        if (target.includes('..')) {
          throw new Error(`CommandBoundaryGuard: Directory escape detected (${target})`);
        }
        
        // Prevent absolute path navigation
        if (target.startsWith('/')) {
          throw new Error(`CommandBoundaryGuard: Absolute directory traversal detected (${target})`);
        }

        // Prevent home directory navigation
        if (target.startsWith('~')) {
          throw new Error(`CommandBoundaryGuard: Home directory traversal detected (${target})`);
        }
      }
    }
  }
}
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
