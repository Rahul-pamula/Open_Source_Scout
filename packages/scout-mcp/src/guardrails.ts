import path from 'node:path';
import fs from 'node:fs';

export type GuardrailLevel = 'strict' | 'standard' | 'audit';

export class GuardrailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GuardrailError';
  }
}

/**
 * Resolves current guardrail policy level from SCOUT_GUARDRAIL_LEVEL env var.
 * Defaults to 'strict'.
 */
export function getGuardrailLevel(): GuardrailLevel {
  const envLevel = (process.env.SCOUT_GUARDRAIL_LEVEL || 'strict').toLowerCase();
  if (envLevel === 'audit' || envLevel === 'standard') {
    return envLevel;
  }
  return 'strict';
}

/**
 * Handles security violation according to active policy level.
 * In 'audit' mode: logs warning and continues without throwing.
 * In 'strict' and 'standard' modes: raises GuardrailError.
 */
export function handleGuardrailViolation(message: string, level: GuardrailLevel = getGuardrailLevel()): void {
  if (level === 'audit') {
    console.warn(`[Guardrail Audit Warning] ${message}`);
    return;
  }
  throw new GuardrailError(message);
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

  static validate(command: string, level?: GuardrailLevel): void {
    const activeLevel = level || getGuardrailLevel();

    for (const pattern of this.DESTRUCTIVE_PATTERNS) {
      if (pattern.regex.test(command)) {
        handleGuardrailViolation(`CommandBoundaryGuard: ${pattern.message}`, activeLevel);
      }
    }

    // Inspect and extract command substitutions: $(...) and `...`
    const subshellMatches = [
      ...Array.from(command.matchAll(/\$\(([^)]+)\)/g), (m) => m[1]),
      ...Array.from(command.matchAll(/`([^`]+)`/g), (m) => m[1]),
    ];

    for (const subshellCmd of subshellMatches) {
      // Recursively validate inner subshell command
      this.validate(subshellCmd, activeLevel);
    }

    // Split command by shell operators to check individual segments
    const segments = command.split(/(?:&&|\|\||;|\n|\|)/).map((s) => s.trim()).filter(Boolean);

    for (const segment of segments) {
      if (segment.startsWith('cd ') || segment.startsWith('pushd ')) {
        const rawTarget = segment.slice(segment.indexOf(' ') + 1).trim();
        const target = rawTarget.replace(/\\/g, '/');
        
        // Prevent traversing up
        if (target.includes('..')) {
          handleGuardrailViolation(`CommandBoundaryGuard: Directory escape detected (${rawTarget})`, activeLevel);
        }
        
        // Prevent absolute path navigation
        if (target.startsWith('/') || /^[a-zA-Z]:[/\\]/.test(rawTarget)) {
          handleGuardrailViolation(`CommandBoundaryGuard: Absolute directory traversal detected (${rawTarget})`, activeLevel);
        }

        // Prevent home directory navigation
        if (target.startsWith('~') || target.startsWith('$HOME')) {
          handleGuardrailViolation(`CommandBoundaryGuard: Home directory traversal detected (${rawTarget})`, activeLevel);
        }
      }
    }
  }
}


export function validatePathBoundary(worktreePath: string, targetPath: string, level?: GuardrailLevel): string {
  const activeLevel = level || getGuardrailLevel();

  // Normalize Windows backslashes to standard forward slashes to prevent traversal bypasses across platforms
  const normalizedTarget = targetPath.replace(/\\/g, '/');
  const absoluteWorktree = path.resolve(worktreePath);
  const absoluteTarget = path.resolve(absoluteWorktree, normalizedTarget);

  // Check Windows absolute drive path (e.g. C:/ or D:\)
  if (/^[a-zA-Z]:[/\\]/.test(targetPath)) {
    handleGuardrailViolation(`Path boundary violation. Windows absolute drive traversal detected (${targetPath}).`, activeLevel);
    return absoluteTarget;
  }

  // Prevent access to hidden root system directories
  const HIDDEN_SYSTEM_PATHS = ['/etc', '/proc', '/sys', '/dev', '/var/run', '/private/etc'];
  if (HIDDEN_SYSTEM_PATHS.some((sysPath) => normalizedTarget === sysPath || normalizedTarget.startsWith(sysPath + '/'))) {
    handleGuardrailViolation(`Path boundary violation. Access to system path ${targetPath} is strictly forbidden.`, activeLevel);
    return absoluteTarget;
  }
  
  if (absoluteTarget !== absoluteWorktree && !absoluteTarget.startsWith(absoluteWorktree + path.sep)) {
    handleGuardrailViolation(`Path boundary violation. Access to ${targetPath} is strictly forbidden outside of the worktree.`, activeLevel);
    return absoluteTarget;
  }

  // Prevent access to .git internals and hooks
  const relativeFromWorktree = path.relative(absoluteWorktree, absoluteTarget);
  const pathSegments = relativeFromWorktree.split(/[/\\]/);
  if (pathSegments.includes('.git')) {
    handleGuardrailViolation(`Path boundary violation. Access to .git directory or Git internals is strictly forbidden (${targetPath}).`, activeLevel);
    return absoluteTarget;
  }

  // Prevent access to cloud/CLI credential directories (.aws, .ssh, .azure, .kube)
  if (pathSegments.some((seg) => ['.ssh', '.aws', '.azure', '.kube'].includes(seg.toLowerCase()))) {
    handleGuardrailViolation(`Path boundary violation. Access to sensitive credential directory is strictly forbidden (${targetPath}).`, activeLevel);
    return absoluteTarget;
  }

  const baseName = path.basename(absoluteTarget).toLowerCase();

  // Prevent access to sensitive environment variable files (allow .env.example, .env.sample, .env.template)
  if (
    baseName === '.env' ||
    (baseName.startsWith('.env.') && !['.env.example', '.env.sample', '.env.template'].includes(baseName))
  ) {
    handleGuardrailViolation(`Path boundary violation. Access to sensitive environment file ${baseName} is strictly forbidden.`, activeLevel);
    return absoluteTarget;
  }

  // Prevent access to private SSH or TLS key files
  if (/^(?:id_rsa|id_ed25519|id_ecdsa|id_dsa)(?:\.pub)?$/.test(baseName) || /\.(?:pem|key|pfx|p12)$/i.test(baseName)) {
    handleGuardrailViolation(`Path boundary violation. Access to sensitive key or credential file ${baseName} is strictly forbidden.`, activeLevel);
    return absoluteTarget;
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
      handleGuardrailViolation(`Path boundary violation (symlink escape). Access to ${targetPath} is strictly forbidden outside of the worktree.`, activeLevel);
      return absoluteTarget;
    }
  }
  
  return absoluteTarget;
}
