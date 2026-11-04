import { WorkspaceCredential } from '../types/workspace';
import { encryptSecret, decryptSecret } from '../utils/cryptoVault';

let inMemoryCreds: Record<string, WorkspaceCredential[]> = {};

/** Closes #787, #788 & #794: Credentials transparent encryption and decryption service */
export const workspaceCredentialService = {
  async listCredentials(workspaceId: string): Promise<WorkspaceCredential[]> {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem) {
        const cached = localStorage.getItem(`scout_creds_${workspaceId}`);
        if (cached) return JSON.parse(cached);
      }
    } catch (e) {}
    return inMemoryCreds[workspaceId] || [];
  },
  async addCredential(
    workspaceId: string,
    cred: { service_name: string; identifier: string; plaintextSecret: string; key: CryptoKey },
  ): Promise<WorkspaceCredential> {
    const { ciphertext, iv } = await encryptSecret(cred.plaintextSecret, cred.key);
    const newCred: WorkspaceCredential = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'cred_' + Date.now(),
      workspace_id: workspaceId,
      service_name: cred.service_name,
      identifier: cred.identifier,
      encrypted_secret: ciphertext,
      iv,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (!inMemoryCreds[workspaceId]) inMemoryCreds[workspaceId] = [];
    inMemoryCreds[workspaceId].push(newCred);
    try {
      if (typeof localStorage !== 'undefined' && localStorage.setItem) {
        localStorage.setItem(
          `scout_creds_${workspaceId}`,
          JSON.stringify(inMemoryCreds[workspaceId]),
        );
      }
    } catch (e) {}
    return newCred;
  },
};

export async function decryptCredentialSecret(
  cred: WorkspaceCredential,
  key: CryptoKey,
): Promise<string> {
  return decryptSecret(cred.encrypted_secret, cred.iv, key);
}
