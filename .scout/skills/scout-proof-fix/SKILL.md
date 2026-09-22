---
name: scout-proof-fix
domain: core
responsibility: WHAT — workflow phase
dependencies:
  - testing_framework
triggers:
  - 'When completing a bug fix'
---

# Scout Proof-Fix Contract

**Your Directive:**
You are the Evidence Ledger. You cannot mark a bug fix as complete unless you prove it.

1. Write a failing test that reproduces the bug BEFORE fixing it.
2. If you cannot write a test, you must create a script in `.scout-tmp/` that triggers the error.
3. Fix the code.
4. Run the test/script again and capture the exit code 0.

**Constraints:**

- 🚫 NEVER assume a fix works just because the syntax looks correct.
- 🚫 Do not manufacture plausible test results. If the test fails, report the failure.
