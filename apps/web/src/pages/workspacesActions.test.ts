import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DEFAULT_STARTER_PACK } from './WorkspacesPage';
import { exportWorkspaceBackup, validateWorkspaceBackup } from '../utils/workspaceBackup';

describe('workspacesActions and Starter Pack suite', () => {
  it('DEFAULT_STARTER_PACK contains valid essential developer tools', () => {
    assert.ok(Array.isArray(DEFAULT_STARTER_PACK));
    assert.strictEqual(DEFAULT_STARTER_PACK.length, 6);

    for (const tool of DEFAULT_STARTER_PACK) {
      assert.ok(tool.title.length > 0, 'tool should have title');
      assert.ok(tool.url.startsWith('https://'), 'url must start with https://');
      assert.ok(tool.section_name.length > 0, 'tool should belong to a section');
      assert.ok(tool.icon_url?.startsWith('https://'), 'icon url must be valid');
    }
  });

  it('verifies unique sections exist in starter pack', () => {
    const sections = Array.from(new Set(DEFAULT_STARTER_PACK.map((t) => t.section_name)));
    assert.ok(sections.length >= 4, 'starter pack should cover multiple diverse sections');
    assert.ok(sections.includes('Developer Tools'));
    assert.ok(sections.includes('Cloud & Database'));
  });

  it('exports and validates workspace backup roundtrip correctly', () => {
    const mockWorkspace = {
      id: 'ws-test-123',
      name: 'Engineering Workspace',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const mockLinks = {
      [mockWorkspace.id]: DEFAULT_STARTER_PACK.map((item, idx) => ({
        id: `link-${idx}`,
        workspace_id: mockWorkspace.id,
        ...item,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
    };

    const exported = exportWorkspaceBackup([mockWorkspace], mockLinks);
    assert.ok(typeof exported === 'string');

    const validation = validateWorkspaceBackup(exported);
    assert.strictEqual(validation.valid, true);
    assert.strictEqual(validation.data?.workspaces.length, 1);
    assert.strictEqual(validation.data?.workspaces[0].id, 'ws-test-123');
    assert.strictEqual(validation.data?.links['ws-test-123'].length, 6);
  });
});
