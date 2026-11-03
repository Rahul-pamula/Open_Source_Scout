# Zero-Knowledge Cryptographic Vault Architecture

This document specifies the client-side cryptographic guarantees, security parameters, and data lifecycle for Open Source Scout's **Access & Credentials Vault**.

---

## 1. Zero-Knowledge Threat Model

In Open Source Scout's Bring-Your-Own-Backend (BYOB) architecture:

- **Plaintext credentials never cross the network boundary.**
- Passwords, access tokens, and sensitive notes are encrypted strictly in the user's browser before transmission to Supabase.
- Neither the hosted client nor the Supabase database instance has knowledge of or access to the master passphrase.

---

## 2. Cryptographic Specifications

| Parameter                      | Specification                            | Standard / RFC             |
| ------------------------------ | ---------------------------------------- | -------------------------- |
| **Cipher**                     | AES-256-GCM                              | NIST SP 800-38D            |
| **Authentication Tag**         | 128-bit Galois Field MAC                 | RFC 5116                   |
| **Key Derivation**             | PBKDF2 with HMAC-SHA-256                 | RFC 2898                   |
| **PBKDF2 Iterations**          | 100,000 iterations                       | OWASP Recommended Minimum  |
| **Salt**                       | 16 bytes (128 bits) CSPRNG               | `crypto.getRandomValues()` |
| **Initialization Vector (IV)** | 12 bytes (96 bits) CSPRNG per encryption | NIST Recommended Nonce     |
| **Key Length**                 | 256 bits                                 | AES-256                    |
