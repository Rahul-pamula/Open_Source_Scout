import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveKeyFromPassphrase,
  encryptSecret,
  decryptSecret,
  encryptWithPassphrase,
  decryptWithPassphrase,
  generateRandomIV,
  generateRandomSalt,
  bufferToBase64,
  base64ToBuffer,
} from './cryptoVault.ts';

describe('cryptoVault - Zero-Knowledge Cryptographic Vault Engine', () => {
  describe('Helper Utilities (IV, Salt, Base64)', () => {
    it('generates random IV with 12 bytes length', () => {
      const iv1 = generateRandomIV();
      const iv2 = generateRandomIV();
      assert.equal(iv1.byteLength, 12);
      assert.equal(iv2.byteLength, 12);
      assert.notDeepEqual(iv1, iv2);
    });

    it('generates random salt with 16 bytes default length', () => {
      const salt1 = generateRandomSalt();
      const salt2 = generateRandomSalt();
      assert.equal(salt1.byteLength, 16);
      assert.equal(salt2.byteLength, 16);
      assert.notDeepEqual(salt1, salt2);
    });

    it('converts ArrayBuffer to Base64 and back with full byte-level fidelity', () => {
      const originalBytes = new Uint8Array([0, 15, 255, 128, 42, 64, 18, 99]);
      const base64 = bufferToBase64(originalBytes);
      const restoredBytes = base64ToBuffer(base64);
      assert.deepEqual(restoredBytes, originalBytes);
    });
  });

  describe('Key Derivation (PBKDF2)', () => {
    it('derives a valid AES-GCM CryptoKey from passphrase and salt', async () => {
      const salt = generateRandomSalt();
      const key = await deriveKeyFromPassphrase('super-secret-master-pin', salt);
      assert.ok(key);
      assert.equal(key.algorithm.name, 'AES-GCM');
    });

    it('rejects empty passphrases', async () => {
      const salt = generateRandomSalt();
      await assert.rejects(
        async () => {
          await deriveKeyFromPassphrase('', salt);
        },
        { message: 'Passphrase cannot be empty.' },
      );
    });
  });

  describe('AES-256-GCM Encryption and Decryption', () => {
    it('encrypts and decrypts secrets with complete fidelity', async () => {
      const salt = generateRandomSalt();
      const key = await deriveKeyFromPassphrase('my-vault-passphrase', salt);
      const plaintext = 'github_pat_11ABCXYZ9999_SuperSecretToken!';

      const { ciphertext, iv } = await encryptSecret(plaintext, key);
      assert.ok(ciphertext);
      assert.ok(iv);
      assert.notEqual(ciphertext, plaintext);

      const decrypted = await decryptSecret(ciphertext, iv, key);
      assert.equal(decrypted, plaintext);
    });
  });
});
