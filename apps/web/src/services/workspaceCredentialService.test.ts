import { describe, test } from 'node:test';
import assert from 'node:assert';
import { deriveKeyFromPassphrase, generateRandomSalt } from '../utils/cryptoVault';
import { workspaceCredentialService, decryptCredentialSecret } from './workspaceCredentialService';

/** Closes #794: workspaceCredentialService test suite */
describe('workspaceCredentialService encryption', () => {
  test('encrypts on save and decrypts on demand', async () => {
    const salt = generateRandomSalt();
    const key = await deriveKeyFromPassphrase('master-pass', salt);
    const cred = await workspaceCredentialService.addCredential('ws_test', {
      service_name: 'HRMS Portal',
      identifier: 'intern@company.com',
      plaintextSecret: 'super-secret-password',
      key,
    });
    assert.ok(cred.encrypted_secret);
    assert.notStrictEqual(cred.encrypted_secret, 'super-secret-password');
    const decrypted = await decryptCredentialSecret(cred, key);
    assert.strictEqual(decrypted, 'super-secret-password');
  });
});
