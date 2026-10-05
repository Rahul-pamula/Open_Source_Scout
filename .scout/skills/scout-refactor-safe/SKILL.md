---
name: scout-refactor-safe
description: Strict rules banning the AI from changing a function's public behavior, only its internals.
trigger: refactor
---

# Scout Safe Refactor Protocol

When refactoring code (e.g., performance tuning, reducing cognitive complexity, extracting methods):

1. **No External Breakage:** The public signature (arguments, return types, and thrown errors) MUST NOT change.
2. **Behavior Parity:** The refactored code must behave exactly the same way as the original code. No new features should be introduced during a refactor.
3. **Tests pass:** The existing test suite MUST pass without modification. If you have to change tests, it's not a pure refactor.
