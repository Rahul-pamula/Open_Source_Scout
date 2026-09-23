import { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import { validatePathBoundary, GuardrailError } from './guardrails.js';

describe('Guardrails', () => {
  it('should allow paths strictly within the worktree', () => {
    const worktreePath = '/tmp/worktree';
    
    assert.strictEqual(
      validatePathBoundary(worktreePath, 'file.txt'),
      path.resolve(worktreePath, 'file.txt')
    );
    
    assert.strictEqual(
      validatePathBoundary(worktreePath, './dir/file.txt'),
      path.resolve(worktreePath, 'dir/file.txt')
    );
    
    assert.strictEqual(
      validatePathBoundary(worktreePath, '/tmp/worktree/file.txt'),
      path.resolve(worktreePath, 'file.txt')
    );
  });

  it('should block paths outside the worktree', () => {
    const worktreePath = '/tmp/worktree';
    
    assert.throws(() => {
      validatePathBoundary(worktreePath, '../file.txt');
    }, GuardrailError);
    
    assert.throws(() => {
      validatePathBoundary(worktreePath, '/etc/passwd');
    }, GuardrailError);
    
    assert.throws(() => {
      validatePathBoundary(worktreePath, '/tmp/worktree_other/file.txt');
    }, GuardrailError);
  });
});
