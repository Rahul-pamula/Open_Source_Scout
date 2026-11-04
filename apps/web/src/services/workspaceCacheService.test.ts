import { describe, test } from 'node:test';
import assert from 'node:assert';
import { workspaceCacheService } from './workspaceCacheService';

/** Closes #795: workspaceCacheService test suite */
describe('workspaceCacheService backup & hydration', () => {
  test('serializes and hydrates cache safely', () => {
    const backup = workspaceCacheService.backupAll([{ id: 'ws1', name: 'Ops' }], { ws1: [] });
    const restored = workspaceCacheService.hydrateFromBackup(backup);
    assert.strictEqual(restored.workspaces.length, 1);
    assert.strictEqual(restored.workspaces[0].name, 'Ops');
  });
});
