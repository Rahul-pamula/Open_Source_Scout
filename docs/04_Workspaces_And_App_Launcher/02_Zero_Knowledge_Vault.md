# Zero-Knowledge Vault Security Architecture

## Cryptographic Standards

- **Cipher:** AES-256-GCM authenticated encryption.
- **Key Derivation:** PBKDF2 with 100,000 iterations and SHA-256.
- **Client-Side Sealing:** Plaintext never leaves browser memory or hits database logs.
- **Auto-Masking:** Plaintext secrets automatically re-mask after 15 seconds.
