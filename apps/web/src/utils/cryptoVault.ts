/**
 * Open Source Scout - Zero-Knowledge Cryptographic Vault Engine
 *
 * Provides client-side Zero-Knowledge encryption/decryption utilities using the Web Crypto API.
 * Ensures plaintext passwords and credentials never leave the user's browser in unencrypted form.
 *
 * Standards:
 * - Cipher: AES-256-GCM (128-bit authentication tag)
 * - Key Derivation: PBKDF2 with HMAC-SHA-256 (100,000 iterations)
 * - IV: 12-byte (96-bit) cryptographically secure random nonce per operation
 * - Salt: 16-byte cryptographically secure random salt per derived key
 */

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;
const IV_BYTE_LENGTH = 12;
const SALT_BYTE_LENGTH = 16;
const VAULT_PAYLOAD_VERSION = 1;

export interface EncryptedPayload {
  v: number; // payload version
  salt: string; // base64 salt
  iv: string; // base64 iv
  data: string; // base64 ciphertext + auth tag
}

/**
 * Safely converts an ArrayBuffer or Uint8Array to a Base64 string.
 */
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Safely converts a Base64 string to a Uint8Array.
 */
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64.trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates a cryptographically random salt.
 */
export function generateRandomSalt(byteLength: number = SALT_BYTE_LENGTH): Uint8Array {
  const salt = new Uint8Array(byteLength);
  crypto.getRandomValues(salt);
  return salt;
}

/**
 * Generates a cryptographically random initialization vector (IV) for AES-GCM.
 */
export function generateRandomIV(byteLength: number = IV_BYTE_LENGTH): Uint8Array {
  const iv = new Uint8Array(byteLength);
  crypto.getRandomValues(iv);
  return iv;
}

/**
 * Derives an AES-256-GCM CryptoKey from a user passphrase and unique salt using PBKDF2.
 */
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

/**
 * Encrypts a plaintext string with a given CryptoKey using AES-256-GCM.
 * Generates a fresh random 12-byte IV per encryption call.
 */
export async function encryptSecret(
  plaintext: string,
  key: CryptoKey,
  customIV?: Uint8Array,
): Promise<{ ciphertext: string; iv: string }> {
  const iv = customIV || generateRandomIV();
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

/**
 * Decrypts an AES-256-GCM ciphertext string with a given CryptoKey and IV.
 * Validates authentication tag automatically (throws error if data is tampered).
 */
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

/**
 * Encrypts plaintext directly using a passphrase.
 * Handles salt generation, key derivation, IV creation, and returns a packed, serialized payload.
 */
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

/**
 * Decrypts a packed, serialized payload directly using a passphrase.
 * Unpacks version, salt, and IV, re-derives the key, and returns the plaintext.
 */
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

/**
 * Safely copies sensitive credentials to the system clipboard, with an automatic clearing timer.
 * Prevents credentials from lingering indefinitely in the operating system clipboard buffer.
 *
 * @param secret - Sensitive text to copy.
 * @param timeoutMs - Time in milliseconds before auto-clearing clipboard (defaults to 30s).
 * @returns A cleanup function to cancel the timeout or trigger immediate clipboard clearing.
 */
export async function copyToClipboardSecurely(
  secret: string,
  timeoutMs: number = 30_000,
): Promise<() => void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    throw new Error('Clipboard API is not supported in this environment.');
  }

  await navigator.clipboard.writeText(secret);

  let timer: ReturnType<typeof setTimeout> | null = setTimeout(async () => {
    try {
      // Clear clipboard if it still contains the secret
      const current = await navigator.clipboard.readText().catch(() => null);
      if (current === secret) {
        await navigator.clipboard.writeText('');
      }
    } catch {
      // Ignore background clipboard clear errors
    } finally {
      timer = null;
    }
  }, timeoutMs);

  return () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
}
