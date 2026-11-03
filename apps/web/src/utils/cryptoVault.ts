/**
 * Open Source Scout - Zero-Knowledge Cryptographic Vault Engine
 *
 * Standards:
 * - Cipher: AES-256-GCM (128-bit authentication tag)
 */

export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64.trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encryptSecret(
  plaintext: string,
  key: CryptoKey,
  iv: Uint8Array,
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const encodedPlaintext = encoder.encode(plaintext);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
      tagLength: 128,
    },
    key,
    encodedPlaintext,
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
  };
}
