---
name: scout-doc-writer
description: Requires updating the README.md and inline docstrings before opening a PR.
trigger: new_feature
---

# Scout Documentation Protocol

When introducing a new feature:

1. **Self-Documenting Code:** Ensure functions have JSDoc/TSDoc comments explaining parameters, return types, and potential side effects.
2. **README updates:** If the feature exposes a new CLI flag, environment variable, or core behavior, it MUST be documented in the repository `README.md` or equivalent architecture docs.
3. **User-Facing:** Ensure the terminology used matches the rest of the application.
