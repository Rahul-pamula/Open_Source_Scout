---
name: scout-dependency-updater
description: Teaches safe peer-dependency conflict resolution.
trigger: maintenance
---

# Scout Dependency Protocol

When adding or updating npm packages:

1. **Peer Dependencies:** Use `--legacy-peer-deps` only if strictly necessary and proven safe. Try resolving conflicts gracefully first.
2. **Lockfiles:** Ensure `package-lock.json` is always committed alongside `package.json` modifications.
3. **Audit:** Run `npm audit` after major dependency additions to ensure no known CVEs are introduced.
