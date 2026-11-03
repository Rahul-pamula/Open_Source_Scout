import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateWorkspaceInput,
  validateLinkInput,
  validateCredentialInput,
} from './workspaces.ts';

describe('workspaces validation utilities', () => {
  describe('validateWorkspaceInput', () => {
    it('approves valid workspace input', () => {
      const res = validateWorkspaceInput({ name: 'Acme Corp Portal' });
      assert.equal(res.valid, true);
    });

    it('rejects empty or whitespace-only name', () => {
      assert.equal(validateWorkspaceInput({ name: '' }).valid, false);
      assert.equal(validateWorkspaceInput({ name: '   ' }).valid, false);
    });

    it('rejects names exceeding 100 characters', () => {
      const longName = 'A'.repeat(101);
      const res = validateWorkspaceInput({ name: longName });
      assert.equal(res.valid, false);
      assert.match(res.error || '', /100 characters/);
    });
  });

  describe('validateLinkInput', () => {
    it('approves valid link with https protocol', () => {
      const res = validateLinkInput({
        workspace_id: 'ws-1',
        title: 'ClickUp Dashboard',
        url: 'https://app.clickup.com/12345/home',
      });
      assert.equal(res.valid, true);
    });

    it('rejects invalid or missing URL', () => {
      assert.equal(
        validateLinkInput({ workspace_id: 'ws-1', title: 'Docs', url: '' }).valid,
        false,
      );
      assert.equal(
        validateLinkInput({ workspace_id: 'ws-1', title: 'Docs', url: 'not-a-url' }).valid,
        false,
      );
    });

    it('rejects non-web protocols (e.g. javascript:, ftp:)', () => {
      const res = validateLinkInput({
        workspace_id: 'ws-1',
        title: 'Exploit',
        url: 'javascript:alert(1)',
      });
      assert.equal(res.valid, false);
    });
  });

  describe('validateCredentialInput', () => {
    it('approves complete credential payload', () => {
      const res = validateCredentialInput({
        workspace_id: 'ws-1',
        service_name: 'AWS Console',
        username: 'intern@company.com',
        encrypted_data: {
          v: 1,
          salt: 'salt123',
          iv: 'iv123',
          data: 'cipher123',
        },
      });
      assert.equal(res.valid, true);
    });

    it('rejects missing service_name or username', () => {
      const res1 = validateCredentialInput({
        workspace_id: 'ws-1',
        service_name: '',
        username: 'admin',
        encrypted_data: { v: 1, salt: 's', iv: 'i', data: 'd' },
      });
      assert.equal(res1.valid, false);

      const res2 = validateCredentialInput({
        workspace_id: 'ws-1',
        service_name: 'Jira',
        username: '',
        encrypted_data: { v: 1, salt: 's', iv: 'i', data: 'd' },
      });
      assert.equal(res2.valid, false);
    });
  });
});
