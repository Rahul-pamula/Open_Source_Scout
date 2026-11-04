import { describe, test } from 'node:test';
import assert from 'node:assert';
import { workspaceService } from './workspaceService';

/** Closes #793: workspaceService test suite */
describe('workspaceService CRUD', () => {
  test('creates, lists and deletes workspaces', async () => {
    const ws = await workspaceService.createWorkspace({ name: 'Internship Ops', color: '#10b981' });
    assert.strictEqual(ws.name, 'Internship Ops');
    const list = await workspaceService.listWorkspaces();
    assert.ok(list.length > 0);
    const ok = await workspaceService.deleteWorkspace(ws.id);
    assert.strictEqual(ok, true);
  });
});
