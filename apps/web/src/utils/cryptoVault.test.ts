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
      // Successive IVs must be cryptographically distinct
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

    it('derives different keys for different salts with same passphrase', async () => {
      const saltA = generateRandomSalt();
      const saltB = generateRandomSalt();
      const keyA = await deriveKeyFromPassphrase('same-passphrase', saltA);
      const keyB = await deriveKeyFromPassphrase('same-passphrase', saltB);

      const plaintext = 'Sensitive Password 123!';
      const fixedIV = generateRandomIV();
      const encA = await encryptSecret(plaintext, keyA, fixedIV);
      const encB = await encryptSecret(plaintext, keyB, fixedIV);

      // Different keys must produce different ciphertexts even with the same IV
      assert.notEqual(encA.ciphertext, encB.ciphertext);
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

    it('handles unicode, emojis, and special symbols in secret payload', async () => {
      const salt = generateRandomSalt();
      const key = await deriveKeyFromPassphrase('vault-pin-42', salt);
      const complexSecret = '🔐 Passw0rd! with 🚀 emojis & symbols: <>&"\'!@#$%^&*()_+';

      const { ciphertext, iv } = await encryptSecret(complexSecret, key);
      const decrypted = await decryptSecret(ciphertext, iv, key);
      assert.equal(decrypted, complexSecret);
    });

    it('throws authentication error when attempting decryption with wrong key', async () => {
      const salt = generateRandomSalt();
      const correctKey = await deriveKeyFromPassphrase('correct-key', salt);
      const wrongKey = await deriveKeyFromPassphrase('wrong-key', salt);

      const { ciphertext, iv } = await encryptSecret('confidential-info', correctKey);

      await assert.rejects(async () => {
        await decryptSecret(ciphertext, iv, wrongKey);
      }, /operation failed|OperationError|decrypt/i);
    });

    it('throws error when ciphertext is tampered or corrupt', async () => {
      const salt = generateRandomSalt();
      const key = await deriveKeyFromPassphrase('vault-pin', salt);
      const { ciphertext, iv } = await encryptSecret('original-secret', key);

      // Corrupt the ciphertext payload
      const bytes = base64ToBuffer(ciphertext);
      bytes[0] ^= 0xff; // flip bits
      const tamperedCiphertext = bufferToBase64(bytes);

      await assert.rejects(async () => {
        await decryptSecret(tamperedCiphertext, iv, key);
      }, /operation failed|OperationError|decrypt/i);
    });

    it('throws error when IV is tampered', async () => {
      const salt = generateRandomSalt();
      const key = await deriveKeyFromPassphrase('vault-pin', salt);
      const { ciphertext, iv } = await encryptSecret('original-secret', key);

      // Corrupt the IV
      const ivBytes = base64ToBuffer(iv);
      ivBytes[0] ^= 0xff;
      const tamperedIV = bufferToBase64(ivBytes);

      await assert.rejects(async () => {
        await decryptSecret(ciphertext, tamperedIV, key);
      }, /operation failed|OperationError|decrypt/i);
    });
  });

  describe('High-Level Passphrase API (encryptWithPassphrase & decryptWithPassphrase)', () => {
    it('encrypts to packed JSON format and recovers secret with matching passphrase', async () => {
      const secret = 'DatabaseMasterSecretKey987';
      const passphrase = 'UserMasterPassphrase!';

      const packed = await encryptWithPassphrase(secret, passphrase);
      const parsed = JSON.parse(packed);
      assert.equal(parsed.v, 1);
      assert.ok(parsed.salt);
      assert.ok(parsed.iv);
      assert.ok(parsed.data);

      const recovered = await decryptWithPassphrase(packed, passphrase);
      assert.equal(recovered, secret);
    });

    it('rejects incorrect passphrase on decryptWithPassphrase', async () => {
      const secret = 'SecretNotes#2026';
      const packed = await encryptWithPassphrase(secret, 'PassphraseA');

      await assert.rejects(async () => {
        await decryptWithPassphrase(packed, 'PassphraseB');
      }, /operation failed|OperationError|decrypt/i);
    });

    it('rejects malformed payload strings', async () => {
      await assert.rejects(
        async () => {
          await decryptWithPassphrase('not-valid-json', 'any-pin');
        },
        { message: 'Invalid vault payload format: Not valid JSON.' },
      );

      await assert.rejects(
        async () => {
          await decryptWithPassphrase(JSON.stringify({ v: 2 }), 'any-pin');
        },
        { message: 'Invalid or unsupported vault payload structure.' },
      );
    });
  });

  describe('Performance Benchmark (Issue #764)', () => {
    it('executes 25 encryption and decryption cycles within acceptable time limits (< 2000ms)', async () => {
      const salt = generateRandomSalt();
      const key = await deriveKeyFromPassphrase('benchmark-key', salt);
      const samplePayload = 'company-internal-api-key-staging-xyz123';

      const startTime = performance.now();
      const iterations = 25;

      for (let i = 0; i < iterations; i++) {
        const { ciphertext, iv } = await encryptSecret(samplePayload, key);
        const decrypted = await decryptSecret(ciphertext, iv, key);
        assert.equal(decrypted, samplePayload);
      }

      const totalMs = performance.now() - startTime;
      const perOpMs = totalMs / iterations;

      // AES-GCM hardware-accelerated encryption should take under 10ms per cycle
      assert.ok(perOpMs < 10, `Expected < 10ms per AES-GCM cycle, got ${perOpMs}ms`);
    });
  });
});
