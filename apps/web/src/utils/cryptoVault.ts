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

export async function decryptSecret(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey,
): Promise<string> {
  const ciphertextBytes = base64ToBuffer(ciphertextBase64);
  const ivBytes = base64ToBuffer(ivBase64);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes as BufferSource,
      tagLength: 128,
    },
    key,
    ciphertextBytes as BufferSource,
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;

export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  if (!passphrase || passphrase.length === 0) {
    throw new Error('Passphrase cannot be empty.');
  }

  const encoder = new TextEncoder();
  const rawKeyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    rawKeyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH_BITS },
    false,
    ['encrypt', 'decrypt'],
  );
}

const IV_BYTE_LENGTH = 12;
const SALT_BYTE_LENGTH = 16;

export function generateRandomSalt(byteLength: number = SALT_BYTE_LENGTH): Uint8Array {
  const salt = new Uint8Array(byteLength);
  crypto.getRandomValues(salt);
  return salt;
}

export function generateRandomIV(byteLength: number = IV_BYTE_LENGTH): Uint8Array {
  const iv = new Uint8Array(byteLength);
  crypto.getRandomValues(iv);
  return iv;
}

const VAULT_PAYLOAD_VERSION = 1;

export interface EncryptedPayload {
  v: number;
  salt: string;
  iv: string;
  data: string;
}

export async function encryptWithPassphrase(
  plaintext: string,
  passphrase: string,
): Promise<string> {
  const salt = generateRandomSalt();
  const key = await deriveKeyFromPassphrase(passphrase, salt);
  const { ciphertext, iv } = await encryptSecret(plaintext, key);

  const payload: EncryptedPayload = {
    v: VAULT_PAYLOAD_VERSION,
    salt: bufferToBase64(salt),
    iv,
    data: ciphertext,
  };

  return JSON.stringify(payload);
}

export async function decryptWithPassphrase(
  packedPayload: string,
  passphrase: string,
): Promise<string> {
  let payload: EncryptedPayload;
  try {
    payload = JSON.parse(packedPayload);
  } catch {
    throw new Error('Invalid vault payload format: Not valid JSON.');
  }

  if (
    !payload ||
    payload.v !== VAULT_PAYLOAD_VERSION ||
    !payload.salt ||
    !payload.iv ||
    !payload.data
  ) {
    throw new Error('Invalid or unsupported vault payload structure.');
  }

  const saltBytes = base64ToBuffer(payload.salt);
  const key = await deriveKeyFromPassphrase(passphrase, saltBytes);
  return decryptSecret(payload.data, payload.iv, key);
}
