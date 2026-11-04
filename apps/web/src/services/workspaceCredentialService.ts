import { WorkspaceCredential } from '../types/workspace';
import { encryptSecret, decryptSecret } from '../utils/cryptoVault';

/** Closes #787 & #788: Workspace credentials encryption & in-memory decryption service */
export const workspaceCredentialService = {
  async listCredentials(workspaceId: string): Promise<WorkspaceCredential[]> {
    try {
      const cached = localStorage.getItem(`scout_creds_${workspaceId}`);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
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
    const existing = await this.listCredentials(workspaceId);
    existing.push(newCred);
    try {
      localStorage.setItem(`scout_creds_${workspaceId}`, JSON.stringify(existing));
    } catch (e) {}
    return newCred;
  },
};

/** Closes #788: On-demand memory decryption of credential secrets */
export async function decryptCredentialSecret(
  cred: WorkspaceCredential,
  key: CryptoKey,
): Promise<string> {
  return decryptSecret(cred.encrypted_secret, key, cred.iv);
}
