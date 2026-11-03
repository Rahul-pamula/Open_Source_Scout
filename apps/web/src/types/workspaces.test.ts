import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateWorkspaceInput } from './workspaces.ts';

describe('workspaces validation utilities', () => {
  it('approves valid workspace input', () => {
    assert.equal(validateWorkspaceInput({ name: 'Acme Corp' }).valid, true);
  });

  it('rejects empty name', () => {
    assert.equal(validateWorkspaceInput({ name: '' }).valid, false);
  });
});
