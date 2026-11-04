import { describe, test } from 'node:test';
import assert from 'node:assert';
import { exportWorkspaceBackup, validateWorkspaceBackup } from './workspaceBackup';

/** Closes #834: Workspace backup serializer & validation tests */
describe('workspaceBackup serialization and validation', () => {
  test('exports and restores valid workspace backups', () => {
    const raw = exportWorkspaceBackup([{ id: 'ws1', name: 'Startup Team' }], { ws1: [] });
    const res = validateWorkspaceBackup(raw);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.data?.workspaces.length, 1);
  });

  test('rejects malformed backup payload', () => {
    const res = validateWorkspaceBackup('{"broken": true}');
    assert.strictEqual(res.valid, false);
  });
});
