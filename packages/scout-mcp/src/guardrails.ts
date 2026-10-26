import path from 'node:path';
import fs from 'node:fs';

export class GuardrailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GuardrailError';
  }
}

export class CommandBoundaryGuard {
  private static readonly DESTRUCTIVE_PATTERNS: Array<{ regex: RegExp; message: string }> = [
    {
      regex: /:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/,
      message: 'Fork bomb pattern detected',
    },
    {
      regex: /\brm\s+-[a-zA-Z]*r[a-zA-Z]*f?[a-zA-Z]*\s+(?:--no-preserve-root\s+)?(?:\/|\/\*|~|\$HOME|\/etc(?:\/.*)?|\/boot(?:\/.*)?|\/sys(?:\/.*)?|\/root(?:\/.*)?)(?:\s|$)/,
      message: 'Destructive root/system recursive deletion detected',
    },
    {
      regex: /\brm\s+-[a-zA-Z]*f[a-zA-Z]*r[a-zA-Z]*\s+(?:--no-preserve-root\s+)?(?:\/|\/\*|~|\$HOME|\/etc(?:\/.*)?|\/boot(?:\/.*)?|\/sys(?:\/.*)?|\/root(?:\/.*)?)(?:\s|$)/,
      message: 'Destructive root/system recursive deletion detected',
    },
    {
      regex: /\bmkfs(?:\.[a-zA-Z0-9]+)?\b/,
      message: 'Filesystem formatting command detected (mkfs)',
    },
    {
      regex: /\bdd\s+.*(?:if|of)=\/dev\//,
      message: 'Raw block device overwrite detected (dd)',
    },
  ];

  static validate(command: string): void {
    for (const pattern of this.DESTRUCTIVE_PATTERNS) {
      if (pattern.regex.test(command)) {
        throw new GuardrailError(`CommandBoundaryGuard: ${pattern.message}`);
      }
    }

    // Split command by shell operators to check individual segments
    const segments = command.split(/(?:&&|\|\||;|\n|\|)/).map(s => s.trim()).filter(Boolean);

    for (const segment of segments) {
      if (segment.startsWith('cd ') || segment.startsWith('pushd ')) {
        const target = segment.slice(segment.indexOf(' ') + 1).trim();
        
        // Prevent traversing up
        if (target.includes('..')) {
          throw new GuardrailError(`CommandBoundaryGuard: Directory escape detected (${target})`);
        }
        
        // Prevent absolute path navigation
        if (target.startsWith('/')) {
          throw new GuardrailError(`CommandBoundaryGuard: Absolute directory traversal detected (${target})`);
        }

        // Prevent home directory navigation
        if (target.startsWith('~')) {
          throw new GuardrailError(`CommandBoundaryGuard: Home directory traversal detected (${target})`);
        }
      }
    }
  }
}


export function validatePathBoundary(worktreePath: string, targetPath: string): string {
  const absoluteWorktree = path.resolve(worktreePath);
  const absoluteTarget = path.resolve(absoluteWorktree, targetPath);
  
  if (absoluteTarget !== absoluteWorktree && !absoluteTarget.startsWith(absoluteWorktree + path.sep)) {
    throw new GuardrailError(`Path boundary violation. Access to ${targetPath} is strictly forbidden outside of the worktree.`);
  }

  // Prevent access to .git internals and hooks
  const relativeFromWorktree = path.relative(absoluteWorktree, absoluteTarget);
  const pathSegments = relativeFromWorktree.split(/[/\\]/);
  if (pathSegments.includes('.git')) {
    throw new GuardrailError(`Path boundary violation. Access to .git directory or Git internals is strictly forbidden (${targetPath}).`);
  }

  // Symlink escape prevention
  let checkPath = absoluteTarget;
  while (!fs.existsSync(checkPath) && checkPath !== path.parse(checkPath).root) {
    checkPath = path.dirname(checkPath);
  }

  if (fs.existsSync(checkPath)) {
    const realCheckPath = fs.realpathSync(checkPath);
    const realWorktree = fs.realpathSync(absoluteWorktree);
    if (realCheckPath !== realWorktree && !realCheckPath.startsWith(realWorktree + path.sep)) {
      throw new GuardrailError(`Path boundary violation (symlink escape). Access to ${targetPath} is strictly forbidden outside of the worktree.`);
    }
  }
  
  return absoluteTarget;
}
