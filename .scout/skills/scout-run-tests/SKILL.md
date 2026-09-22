---
name: scout-run-tests
domain: delivery
responsibility: HOW — tool skill
dependencies:
  - package.json or pyproject.toml
triggers:
  - 'Before submitting any pull request or marking a task complete'
---

# Scout Run-Tests Contract

**Your Directive:**
Before closing a task, you MUST run the repository's test suite to ensure your changes did not introduce regressions.

1. Identify the test command (e.g., `npm test`, `pytest`).
2. Run the full test suite.
3. If tests fail, you MUST fix them before proceeding.

**Constraints:**

- 🚫 Do not skip this step unless explicitly told the repository has no tests.
- 🚫 Do not mock the test output. You must capture the real terminal receipt.
